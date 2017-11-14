/* global artifacts */

const BN = require('bn.js');
const fs = require('fs');
const HttpProvider = require('ethjs-provider-http');
const EthRPC = require('ethjs-rpc');
const EthQuery = require('ethjs-query');

const Sale = artifacts.require('./Sale.sol');
const HumanStandardToken = artifacts.require('./HumanStandardToken.sol');
const Disbursement = artifacts.require('./Disbursement.sol');

const preBuyersConf = JSON.parse(fs.readFileSync('./conf/preBuyers.json'));
const timelocksConf = JSON.parse(fs.readFileSync('./conf/timelocks.json'));
const saleConf = JSON.parse(fs.readFileSync('./conf/sale.json'));
const logs = JSON.parse(fs.readFileSync('./logs/logs.json'));

const ethRPC = new EthRPC(new HttpProvider('http://localhost:7545'));
const ethQuery = new EthQuery(new HttpProvider('http://localhost:7545'));

const utils = {

  purchaseTokens: async (actor, amount) => {
    if (!BN.isBN(amount)) { throw new Error('Supplied amount is not a BN.'); }
    const sale = await Sale.deployed();
    await sale.purchaseTokens({ from: actor, value: amount.mul(new BN(saleConf.price, 10)) });
  },

  getTokenBalanceOf: async (actor) => {
    const sale = await Sale.deployed();
    const tokenAddr = await sale.token.call();
    const token = HumanStandardToken.at(tokenAddr);
    const balance = await token.balanceOf.call(actor);
    return new BN(balance.toString(10), 10);
  },

  totalPreSoldTokens: () => {
    const preSoldTokens = Object.keys(preBuyersConf).map(curr =>
      new BN(preBuyersConf[curr].amount, 10));
    return preSoldTokens.reduce((sum, value) => sum.add(new BN(value, 10)), new BN(0, 10));
  },


  getTranchesForBeneficiary: (addr) => {
    const beneficiary = timelocksConf[
      Object.keys(timelocksConf).find((beneficiaryIndex) => {
        const thisBeneficiary = timelocksConf[beneficiaryIndex];
        return thisBeneficiary.address === addr;
      })
    ];

    return beneficiary.tranches;
  },

  getDisburserByBeneficiaryAndTranch: (beneficiary, tranch) => {
    const logForTranch = logs.find(log =>
      log.args.beneficiary === beneficiary.toLowerCase() &&
      log.args.amount === tranch.amount);

    if (logForTranch === undefined) { throw new Error(`Missing disburser for ${beneficiary}`); }

    return Disbursement.at(logForTranch.args.disburser);
  },

  getDisbursersForBeneficiary: (beneficiary) => {
    const tranches = Object.keys(utils.getTranchesForBeneficiary(beneficiary)).map(tranchIndex =>
      utils.getTranchesForBeneficiary(beneficiary)[tranchIndex]);
    return tranches.map(tranch =>
      utils.getDisburserByBeneficiaryAndTranch(beneficiary, tranch));
  },

  getTimelockedBeneficiaries: () =>
    Object.keys(timelocksConf).map(beneficiaryIndex => timelocksConf[beneficiaryIndex]),

  totalTimelockedTokens: () => {
    function getDisburserTokenBalances() {
      let disburserTokenBalances = [];

      utils.getTimelockedBeneficiaries().forEach((beneficiary) => {
        const tranches = utils.getTranchesForBeneficiary(beneficiary.address);
        disburserTokenBalances =
          disburserTokenBalances.concat(Object.keys(tranches).map((tranchIndex) => {
            const tranch = tranches[tranchIndex];
            return tranch.amount;
          }));
      });

      return disburserTokenBalances;
    }

    const timelockedTokens = getDisburserTokenBalances();

    return timelockedTokens.reduce((sum, value) => sum.add(new BN(value, 10)), new BN(0, 10));
  },

  isSignerAccessFailure: (err) => {
    const signerAccessFailure = 'could not unlock signer account';
    return err.toString().includes(signerAccessFailure);
  },

  isEVMException: err => err.toString().includes('invalid opcode'),

  forceMine: blockToMine =>
    new Promise(async (resolve, reject) => {
      if (!BN.isBN(blockToMine)) {
        reject(new Error('Supplied block number must be a BN.'));
      }
      const blockNumber = await ethQuery.blockNumber();
      if (blockNumber.lt(blockToMine)) {
        ethRPC.sendAsync({ method: 'evm_mine' }, (err) => {
          if (err !== undefined && err !== null) { reject(err); }
          resolve(utils.forceMine(blockToMine));
        });
      } else {
        resolve();
      }
    }),

  as: (actor, fn, ...args) => {
    function detectSendObject(potentialSendObj) {
      function hasOwnProperty(obj, prop) {
        const proto = obj.constructor.prototype;
        return (prop in obj) &&
       (!(prop in proto) || proto[prop] !== obj[prop]);
      }
      if (typeof potentialSendObj !== 'object') { return undefined; }
      if (
        hasOwnProperty(potentialSendObj, 'from') ||
        hasOwnProperty(potentialSendObj, 'to') ||
        hasOwnProperty(potentialSendObj, 'gas') ||
        hasOwnProperty(potentialSendObj, 'gasPrice') ||
        hasOwnProperty(potentialSendObj, 'value')
      ) {
        throw new Error('It is unsafe to use "as" with custom send objects');
      }
      return undefined;
    }
    detectSendObject(args[args.length - 1]);
    const sendObject = { from: actor };
    return fn(...args, sendObject);
  },
};

module.exports = utils;

