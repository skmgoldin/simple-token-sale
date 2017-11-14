/* eslint-env mocha */
/* global artifacts assert contract */

const fs = require('fs');
const BN = require('bn.js');

const Sale = artifacts.require('./Sale.sol');

const saleConf = JSON.parse(fs.readFileSync('./conf/sale.json'));
const tokenConf = JSON.parse(fs.readFileSync('./conf/token.json'));

contract('Sale', () => {
  describe('Instantiation', () => {
    const badInitialization = 'was not initialized properly';

    before(() => {
      saleConf.price = new BN(saleConf.price, 10);
      saleConf.startBlock = new BN(saleConf.startBlock, 10);
      tokenConf.initialAmount = new BN(tokenConf.initialAmount, 10);
    });

    it(`should instantiate with the price set to ${saleConf.price} Wei.`, async () => {
      const sale = await Sale.deployed();
      const price = await sale.price.call();
      const expected = saleConf.price;
      const errMsg = `The price ${badInitialization}`;
      assert.strictEqual(price.toString(10), expected.toString(10), errMsg);
    });

    it(`should instantiate with the owner set to ${saleConf.owner}.`, async () => {
      const sale = await Sale.deployed();
      const actualOwner = await sale.owner.call();
      const expected = saleConf.owner.toLowerCase();
      const errMsg = `The owner ${badInitialization}`;
      assert.strictEqual(actualOwner.valueOf(), expected, errMsg);
    });

    it(`should instantiate with the wallet set to ${saleConf.wallet}.`, async () => {
      const sale = await Sale.deployed();
      const wallet = await sale.wallet.call();
      const expected = saleConf.wallet;
      const errMsg = `The wallet ${badInitialization}`;
      assert.strictEqual(wallet.valueOf(), expected.toLowerCase(), errMsg);
    });

    it(`should instantiate with the startBlock set to ${saleConf.startBlock}.`, async () => {
      const sale = await Sale.deployed();
      const startBlock = await sale.startBlock.call();
      const expected = saleConf.startBlock;
      const errMsg = `The start block ${badInitialization}`;
      assert.strictEqual(
        startBlock.toString(10), expected.toString(10), errMsg,
      );
    });
  });
});

