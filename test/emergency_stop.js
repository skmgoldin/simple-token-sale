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

  describe('Emergency stop', () => {
    const purchaseInStopError = ' was able to purchase during the emergency stop';
    const balanceError = 'A balance was not utils.as expected following a purchase';

    before(async () => {
      saleConf.price = new BN(saleConf.price, 10);
      saleConf.startBlock = new BN(saleConf.startBlock, 10);
      tokenConf.initialAmount = new BN(tokenConf.initialAmount, 10);

      await utils.forceMine(saleConf.startBlock);
      const sale = await Sale.deployed();
      await utils.as(owner, sale.emergencyToggle);
    });

    it('should not transfer 1 token to James.', async () => {
      const startingBalance = await utils.getTokenBalanceOf(james);
      const purchaseAmount = new BN('1', 10);
      try {
        await utils.purchaseTokens(james, purchaseAmount);
        const errMsg = james + purchaseInStopError;
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
        const errMsg = miguel + purchaseInStopError;
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
        const errMsg = edwhale + purchaseInStopError;
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
  });
});

