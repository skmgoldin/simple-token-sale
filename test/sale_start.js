/* eslint-env mocha */
/* global artifacts assert contract */

const fs = require('fs');
const BN = require('bn.js');
const utils = require('./utils');

const Sale = artifacts.require('./Sale.sol');

const saleConf = JSON.parse(fs.readFileSync('./conf/sale.json'));
const tokenConf = JSON.parse(fs.readFileSync('./conf/token.json'));

contract('Sale', (accounts) => {
  const [owner, james, miguel, edwhale] = accounts;

  describe('Sale start', () => {
    const balanceError = 'A balance was not utils.as expected following a purchase';

    before(async () => {
      saleConf.price = new BN(saleConf.price, 10);
      saleConf.startBlock = new BN(saleConf.startBlock, 10);
      tokenConf.initialAmount = new BN(tokenConf.initialAmount, 10);

      await utils.forceMine(saleConf.startBlock);
    });

    it('should not allow the owner to change the price', async () => {
      const sale = await Sale.deployed();
      try {
        await utils.as(owner, sale.changePrice, saleConf.price + 1);
      } catch (err) {
        const errMsg = err.toString();
        assert(utils.isEVMRevert(err), errMsg);
      }
      const price = await sale.price.call();
      const expected = saleConf.price;
      const errMsg = 'The owner was able to change the price after the freeze block';
      assert.strictEqual(price.toString(10), expected.toString(10), errMsg);
    });

    it('should transfer 1 token to James.', async () => {
      const startingBalance = await utils.getTokenBalanceOf(james);
      const purchaseAmount = new BN('1', 10);
      await utils.purchaseTokens(james, purchaseAmount);
      const finalBalance = await utils.getTokenBalanceOf(james);
      const expected = startingBalance.add(purchaseAmount);
      const errMsg = balanceError;
      assert.strictEqual(finalBalance.toString(10), expected.toString(10), errMsg);
    });

    it('should transfer 10 tokens to Miguel.', async () => {
      const startingBalance = await utils.getTokenBalanceOf(miguel);
      const purchaseAmount = new BN('10', 10);
      await utils.purchaseTokens(miguel, purchaseAmount);
      const finalBalance = await utils.getTokenBalanceOf(miguel);
      const expected = startingBalance.add(purchaseAmount);
      const errMsg = balanceError;
      assert.strictEqual(finalBalance.toString(10), expected.toString(10), errMsg);
    });

    it('should transfer 100 tokens to Edwhale.', async () => {
      const startingBalance = await utils.getTokenBalanceOf(edwhale);
      const purchaseAmount = new BN('100', 10);
      await utils.purchaseTokens(edwhale, purchaseAmount);
      const finalBalance = await utils.getTokenBalanceOf(edwhale);
      const expected = startingBalance.add(purchaseAmount);
      const errMsg = balanceError;
      assert.strictEqual(finalBalance.toString(10), expected.toString(10), errMsg);
    });
  });
});

