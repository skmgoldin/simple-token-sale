/* eslint-env mocha */
/* global assert contract */

const fs = require('fs');
const BN = require('bn.js');
const utils = require('./utils');

const saleConf = JSON.parse(fs.readFileSync('./conf/sale.json'));
const tokenConf = JSON.parse(fs.readFileSync('./conf/token.json'));

contract('Sale', (accounts) => {
  const [, james] = accounts;

  describe('Pre-sale period', () => {
    const earlyPurchaseError = ' was able to purchase tokens early';

    before(() => {
      saleConf.price = new BN(saleConf.price, 10);
      saleConf.startBlock = new BN(saleConf.startBlock, 10);
      tokenConf.initialAmount = new BN(tokenConf.initialAmount, 10);
    });

    it('should reject a purchase from James.', async () => {
      const startingBalance = await utils.getTokenBalanceOf(james);
      try {
        await utils.purchaseTokens(james, new BN('420', 10));
        const errMsg = james + earlyPurchaseError;
        assert(false, errMsg);
      } catch (err) {
        const errMsg = err.toString();
        assert(utils.isEVMException(err), errMsg);
      }
      const finalBalance = await utils.getTokenBalanceOf(james);
      const expected = startingBalance;
      const errMsg = james + earlyPurchaseError;
      assert.equal(
        finalBalance.toString(10), expected.toString(10), errMsg,
      );
    });
  });
});

