/* eslint-env mocha */
/* global artifacts assert contract */

const fs = require('fs');
const BN = require('bn.js');
const HttpProvider = require('ethjs-provider-http');
const EthQuery = require('ethjs-query');
const utils = require('./utils');

const Sale = artifacts.require('./Sale.sol');
const EIP20 = artifacts.require('tokens/eip20/EIP20.sol');

const ethQuery = new EthQuery(new HttpProvider('http://localhost:7545'));

const saleConf = JSON.parse(fs.readFileSync('./conf/sale.json'));
const tokenConf = JSON.parse(fs.readFileSync('./conf/token.json'));

let tokensForSale;

contract('Sale', (accounts) => {
  const [, james, miguel, edwhale] = accounts;

  describe('Post-sale period', () => {
    const balanceError = 'A balance was not utils.as expected following a purchase';
    const sellOutError = ' was able to purchase when the sale was sold out';

    before(async () => {
      const tokensPreAllocated = utils.totalPreSoldTokens().add(utils.totalTimelockedTokens());
      saleConf.price = new BN(saleConf.price, 10);
      saleConf.startBlock = new BN(saleConf.startBlock, 10);
      tokenConf.initialAmount = new BN(tokenConf.initialAmount, 10);
      tokensForSale = tokenConf.initialAmount.sub(tokensPreAllocated);

      await utils.forceMine(saleConf.startBlock);

      const saleBalance = await utils.getTokenBalanceOf(Sale.address);
      await utils.purchaseTokens(edwhale, saleBalance);
    });

    it('should not transfer 1 token to James.', async () => {
      const startingBalance = await utils.getTokenBalanceOf(james);
      const purchaseAmount = new BN('1', 10);
      try {
        await utils.purchaseTokens(james, purchaseAmount);
        const errMsg = james + sellOutError;
        assert(false, errMsg);
      } catch (err) {
        const errMsg = err.toString();
        assert(utils.isEVMRevert(err), errMsg);
      }
      const finalBalance = await utils.getTokenBalanceOf(james);
      const expected = startingBalance;
      const errMsg = balanceError;
      assert.strictEqual(finalBalance.toString(10), expected.toString(10), errMsg);
    });

    it('should not transfer 10 tokens to Miguel.', async () => {
      const startingBalance = await utils.getTokenBalanceOf(miguel);
      const purchaseAmount = new BN('10', 10);
      try {
        await utils.purchaseTokens(miguel, purchaseAmount);
        const errMsg = miguel + sellOutError;
        assert(false, errMsg);
      } catch (err) {
        const errMsg = err.toString();
        assert(utils.isEVMRevert(err), errMsg);
      }
      const finalBalance = await utils.getTokenBalanceOf(miguel);
      const expected = startingBalance;
      const errMsg = balanceError;
      assert.strictEqual(finalBalance.toString(10), expected.toString(10), errMsg);
    });

    it('should not transfer 100 tokens to Edwhale.', async () => {
      const startingBalance = await utils.getTokenBalanceOf(edwhale);
      const purchaseAmount = new BN('100', 10);
      try {
        await utils.purchaseTokens(edwhale, purchaseAmount);
        const errMsg = edwhale + sellOutError;
        assert(false, errMsg);
      } catch (err) {
        const errMsg = err.toString();
        assert(utils.isEVMRevert(err), errMsg);
      }
      const finalBalance = await utils.getTokenBalanceOf(edwhale);
      const expected = startingBalance;
      const errMsg = balanceError;
      assert.strictEqual(finalBalance.toString(10), expected.toString(10), errMsg);
    });

    it('should report the proper sum of Wei in the wallet.', async () => {
      const balance = await ethQuery.getBalance(saleConf.wallet);
      const expected = tokensForSale.mul(saleConf.price);
      const errMsg = 'The amount of Ether in the wallet is not what it should be at sale end';
      assert.strictEqual(balance.toString(10), expected.toString(10), errMsg);
    });

    it('should report a zero balance for the sale contract.', async () => {
      const balance = await utils.getTokenBalanceOf(Sale.address);
      const expected = new BN('0', 10);
      const errMsg = 'The sale contract still has tokens in it when it should be sold out';
      assert.strictEqual(balance.toString(10), expected.toString(10), errMsg);
    });

    it('should allow Edwhale to transfer 10 tokens to James.', async () => {
      const transferAmount = new BN('10', 10);
      const edwhaleStartingBalance = await utils.getTokenBalanceOf(edwhale);
      const jamesStartingBalance = await utils.getTokenBalanceOf(james);
      const sale = await Sale.deployed();
      const tokenAddr = await sale.token.call();
      const token = EIP20.at(tokenAddr);
      await utils.as(edwhale, token.transfer, james, transferAmount.toString(10));
      const edwhaleFinalBalance = await utils.getTokenBalanceOf(edwhale);
      const edwhaleExpected = edwhaleStartingBalance.sub(transferAmount);
      const errMsg = balanceError;
      assert.strictEqual(edwhaleFinalBalance.toString(10), edwhaleExpected.toString(10), errMsg);
      const jamesFinalBalance = await utils.getTokenBalanceOf(james);
      const jamesExpected = jamesStartingBalance.add(transferAmount);
      assert.strictEqual(jamesFinalBalance.toString(10), jamesExpected.toString(10), errMsg);
    });
  });
});

