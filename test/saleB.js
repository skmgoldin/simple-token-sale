// Run a second simulation, this time testing the endBlock parameter
/* eslint-env mocha */
/* global artifacts assert contract */

const HumanStandardToken = artifacts.require('./HumanStandardToken.sol');
const fs = require('fs');
const BN = require('bn.js');
const HttpProvider = require('ethjs-provider-http');
const EthRPC = require('ethjs-rpc');
const EthQuery = require('ethjs-query');

const ethRPC = new EthRPC(new HttpProvider('http://localhost:8545'));
const ethQuery = new EthQuery(new HttpProvider('http://localhost:8545'));

const Sale = artifacts.require('./Sale.sol');

contract('Sale', (accounts) => {
  const saleConf = JSON.parse(fs.readFileSync('./conf/sale.json'));
  const tokenConf = JSON.parse(fs.readFileSync('./conf/token.json'));
  const [james] = accounts;

  /*
   * Utility Functions
   */

  async function purchaseToken(actor, amount) {
    if (!BN.isBN(amount)) { throw new Error('Supplied amount is not a BN.'); }
    const sale = await Sale.deployed();
    await sale.purchaseTokens({ from: actor, value: amount.mul(saleConf.price) });
  }

  async function getTokenBalanceOf(actor) {
    const sale = await Sale.deployed();
    const tokenAddr = await sale.token.call();
    const token = HumanStandardToken.at(tokenAddr);
    const balance = await token.balanceOf.call(actor);
    return new BN(balance.toString(10), 10);
  }

  function isEVMException(err) {
    return err.toString().includes('invalid opcode');
  }

  function forceMine(blockToMine) {
    return new Promise(async (resolve, reject) => {
      if (!BN.isBN(blockToMine)) {
        reject('Supplied block number must be a BN.');
      }
      const blockNumber = await ethQuery.blockNumber();
      if (blockNumber.lt(blockToMine)) {
        ethRPC.sendAsync({ method: 'evm_mine' }, (err) => {
          if (err !== undefined && err !== null) { reject(err); }
          resolve(forceMine(blockToMine));
        });
      } else {
        resolve();
      }
    });
  }

  before(() => {
    saleConf.price = new BN(saleConf.price, 10);
    saleConf.startBlock = new BN(saleConf.startBlock, 10);
    saleConf.endBlock = new BN(saleConf.endBlock, 10);
    tokenConf.initialAmount = new BN(tokenConf.initialAmount, 10);
  });

  describe('Sale ends before all tokens are sold', () => {
    it('should stop selling tokens after the endBlock', async () => {
      await forceMine(saleConf.endBlock.add(new BN('1', 10)));
      const errMsg = 'James was able to purchase tokens after the sale ended';

      const startingBalance = await getTokenBalanceOf(james);
      try {
        await purchaseToken(james, new BN('420', 10));
        assert(false, errMsg);
      } catch (err) {
        assert(isEVMException(err), err.toString());
      }
      const finalBalance = await getTokenBalanceOf(james);
      assert.strictEqual(startingBalance.toString(10), finalBalance.toString(10), errMsg);
    });
  });
});
