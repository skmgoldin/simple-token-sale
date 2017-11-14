/* eslint-env mocha */
/* global artifacts assert contract */

const fs = require('fs');
const BN = require('bn.js');
const HttpProvider = require('ethjs-provider-http');
const EthQuery = require('ethjs-query');
const utils = require('./utils');

const Sale = artifacts.require('./Sale.sol');

const ethQuery = new EthQuery(new HttpProvider('http://localhost:7545'));

const saleConf = JSON.parse(fs.readFileSync('./conf/sale.json'));
const tokenConf = JSON.parse(fs.readFileSync('./conf/token.json'));

contract('Sale', (accounts) => {
  const [, , , edwhale] = accounts;

  describe('Sale end', () => {
    const balanceError = 'A balance was not utils.as expected following a purchase';

    before(async () => {
      saleConf.price = new BN(saleConf.price, 10);
      saleConf.startBlock = new BN(saleConf.startBlock, 10);
      tokenConf.initialAmount = new BN(tokenConf.initialAmount, 10);

      await utils.forceMine(saleConf.startBlock);
    });

    it('should reject a transfer of tokens to Edwhale greater than the sum ' +
       'of tokens available for purchase.', async () => {
      const startingBalance = await utils.getTokenBalanceOf(edwhale);
      const saleBalance = await utils.getTokenBalanceOf(Sale.address);
      const tooMuch = saleBalance.add(new BN('1', 10));
      try {
        await utils.purchaseTokens(edwhale, tooMuch);
        const errMsg = `${edwhale} was able to purchase more tokens than should ` +
          'be available';
        assert(false, errMsg);
      } catch (err) {
        const errMsg = err.toString();
        assert(utils.isEVMException(err), errMsg);
      }
      const finalBalance = await utils.getTokenBalanceOf(edwhale);
      const expected = startingBalance;
      const errMsg = balanceError;
      assert.strictEqual(finalBalance.toString(10), expected.toString(10), errMsg);
    });

    it('should return excess Wei to Edwhale', async () => {
      const startingBalance = await ethQuery.getBalance(edwhale);
      const gasPrice = await ethQuery.gasPrice();
      const sale = await Sale.deployed();
      const excessEther = saleConf.price.div(new BN('2', 10));
      const receipt =
        await sale.purchaseTokens({
          value: saleConf.price.add(excessEther),
          from: edwhale,
          gasPrice,
        });
      const gasUsed = new BN(receipt.receipt.gasUsed, 10);
      const expectedEthDebit = gasPrice.mul(gasUsed).add(saleConf.price);
      const finalBalance = await ethQuery.getBalance(edwhale);
      const expected = startingBalance.sub(expectedEthDebit);
      const errMsg = 'Edwhale\'s ether balance is not utils.as expected following ' +
        'a purchase transaction';
      assert.strictEqual(finalBalance.toString(10), expected.toString(10), errMsg);
    });

    it('should transfer all the remaining tokens to Edwhale.', async () => {
      const startingBalance = await utils.getTokenBalanceOf(edwhale);
      const saleBalance = await utils.getTokenBalanceOf(Sale.address);
      await utils.purchaseTokens(edwhale, saleBalance);
      const finalBalance = await utils.getTokenBalanceOf(edwhale);
      const expected = startingBalance.add(saleBalance);
      const errMsg = balanceError;
      assert.strictEqual(finalBalance.toString(10), expected.toString(10), errMsg);
    });
  });
});

