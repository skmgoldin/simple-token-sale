/* eslint-env mocha */
/* global artifacts assert contract */

const fs = require('fs');
const BN = require('bn.js');
const utils = require('./utils');

const Sale = artifacts.require('./Sale.sol');

const preBuyersConf = JSON.parse(fs.readFileSync('./conf/preBuyers.json'));
const saleConf = JSON.parse(fs.readFileSync('./conf/sale.json'));
const tokenConf = JSON.parse(fs.readFileSync('./conf/token.json'));

let tokensForSale;

contract('Sale', () => {
  describe('Initial token issuance', () => {
    const wrongTokenBalance = 'has an incorrect token balance.';

    before(() => {
      const tokensPreAllocated = utils.totalPreSoldTokens().add(utils.totalTimelockedTokens());
      saleConf.price = new BN(saleConf.price, 10);
      saleConf.startBlock = new BN(saleConf.startBlock, 10);
      tokenConf.initialAmount = new BN(tokenConf.initialAmount, 10);
      tokensForSale = tokenConf.initialAmount.sub(tokensPreAllocated);
    });

    it('should instantiate preBuyers with the proper number of tokens', () =>
      Promise.all(Object.keys(preBuyersConf).map(async (curr) => {
        const tokenBalance =
            await utils.getTokenBalanceOf(preBuyersConf[curr].address);
        const expected = preBuyersConf[curr].amount;
        const errMsg = `A pre-buyer ${wrongTokenBalance}`;
        assert.strictEqual(tokenBalance.toString(10), expected.toString(10), errMsg);
      })));

    it('should instantiate disburser contracts with the proper number of tokens', async () =>
      Promise.all(utils.getTimelockedBeneficiaries().map(async (beneficiary) => {
        const beneficiaryTranches = utils.getTranchesForBeneficiary(beneficiary.address);
        return Promise.all(Object.keys(beneficiaryTranches).map(async (tranchIndex) => {
          const tranch = beneficiary.tranches[tranchIndex];
          const disburser =
                utils.getDisburserByBeneficiaryAndTranch(beneficiary.address, tranch);
          const tokenBalance = await utils.getTokenBalanceOf(disburser.address);
          const expected = tranch.amount;
          const errMsg = `A disburser contract ${wrongTokenBalance}`;
          assert.strictEqual(tokenBalance.toString(10), expected.toString(10), errMsg);
        }));
      })));

    it('should instantiate the public sale with the total supply of tokens ' +
       'minus the sum of tokens pre-sold.', async () => {
      const tokenBalance = await utils.getTokenBalanceOf(Sale.address);
      const expected = tokensForSale.toString(10);
      const errMsg = `The sale contract ${wrongTokenBalance}`;
      assert.strictEqual(tokenBalance.toString(10), expected.toString(10), errMsg);
    });
  });
});

