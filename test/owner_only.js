/* eslint-env mocha */
/* global artifacts assert contract */

const fs = require('fs');
const BN = require('bn.js');
const utils = require('./utils');

const Sale = artifacts.require('./Sale.sol');

const saleConf = JSON.parse(fs.readFileSync('./conf/sale.json'));
const tokenConf = JSON.parse(fs.readFileSync('./conf/token.json'));

contract('Sale', (accounts) => {
  const [owner, james, miguel] = accounts;

  describe('Owner-only functions', () => {
    const nonOwnerAccessError = 'A non-owner was able to';
    const ownerAccessError = 'An owner was unable able to';

    before(() => {
      saleConf.price = new BN(saleConf.price, 10);
      saleConf.startBlock = new BN(saleConf.startBlock, 10);
      tokenConf.initialAmount = new BN(tokenConf.initialAmount, 10);
    });

    it('should not allow a non-owner to change the price.', async () => {
      const sale = await Sale.deployed();
      try {
        await utils.as(james, sale.changePrice, saleConf.price + 1);
      } catch (err) {
        const errMsg = err.toString();
        assert(utils.isEVMException(err), errMsg);
      }
      const price = await sale.price.call();
      const expected = saleConf.price;
      const errMsg = `${nonOwnerAccessError} change the price`;
      assert.strictEqual(price.toString(10), expected.toString(10), errMsg);
    });

    it('should not allow a non-owner to change the startBlock.', async () => {
      const sale = await Sale.deployed();
      try {
        await utils.as(james, sale.changeStartBlock, saleConf.startBlock + 1);
      } catch (err) {
        const errMsg = err.toString();
        assert(utils.isEVMException(err), errMsg);
      }
      const startBlock = await sale.startBlock.call();
      const expected = saleConf.startBlock;
      const errMsg = `${nonOwnerAccessError} change the start block`;
      assert.strictEqual(startBlock.toString(10), expected.toString(10), errMsg);
    });

    it('should not allow a non-owner to change the owner', async () => {
      const sale = await Sale.deployed();
      try {
        await utils.as(james, sale.changeOwner, james);
      } catch (err) {
        const errMsg = err.toString();
        assert(utils.isEVMException(err), errMsg);
      }
      const actualOwner = await sale.owner.call();
      const expected = saleConf.owner.toLowerCase();
      const errMsg = `${nonOwnerAccessError} change the owner`;
      assert.strictEqual(actualOwner.toString(), expected.toString(), errMsg);
    });

    it('should not allow a non-owner to change the wallet', async () => {
      const sale = await Sale.deployed();
      try {
        await utils.as(james, sale.changeWallet, james);
      } catch (err) {
        const errMsg = err.toString();
        assert(utils.isEVMException(err), errMsg);
      }
      const wallet = await sale.wallet.call();
      const expected = saleConf.wallet;
      const errMsg = `${nonOwnerAccessError} change the wallet`;
      assert.strictEqual(wallet.toString(), expected.toLowerCase(), errMsg);
    });

    it('should not allow a non-owner to activate the emergencyToggle', async () => {
      const sale = await Sale.deployed();
      try {
        await utils.as(james, sale.emergencyToggle);
      } catch (err) {
        const errMsg = err.toString();
        assert(utils.isEVMException(err), errMsg);
      }
      const emergencyFlag = await sale.emergencyFlag.call();
      const expected = false;
      const errMsg = `${nonOwnerAccessError} change the emergencyToggle`;
      assert.strictEqual(emergencyFlag, expected, errMsg);
    });

    it('should change the owner to miguel.', async () => {
      const sale = await Sale.deployed();
      await utils.as(saleConf.owner, sale.changeOwner, miguel);
      const actualOwner = await sale.owner.call();
      const expected = miguel;
      const errMsg = `${ownerAccessError} change the owner`;
      assert.strictEqual(actualOwner, expected, errMsg);
      await utils.as(miguel, sale.changeOwner, saleConf.owner);
    });

    it('should change the price to 2666.', async () => {
      const sale = await Sale.deployed();
      await utils.as(owner, sale.changePrice, 2666);
      const price = await sale.price.call();
      const expected = 2666;
      const errMsg = `${ownerAccessError} change the price`;
      assert.strictEqual(price.toString(10), expected.toString(10), errMsg);
      await utils.as(owner, sale.changePrice, saleConf.price.toString(10));
    });

    it('should change the startBlock to 2666.', async () => {
      const sale = await Sale.deployed();
      await utils.as(owner, sale.changeStartBlock, 2666);
      const price = await sale.startBlock.call();
      const expected = 2666;
      const errMsg = `${ownerAccessError} change the start block`;
      assert.strictEqual(price.toString(10), expected.toString(10), errMsg);
      await utils.as(owner, sale.changeStartBlock, saleConf.startBlock.toString(10));
    });

    it('should change the wallet address', async () => {
      const newWallet = '0x0000000000000000000000000000000000000001';
      const sale = await Sale.deployed();
      await utils.as(owner, sale.changeWallet, newWallet);
      const wallet = await sale.wallet.call();
      const expected = newWallet;
      const errMsg = `${ownerAccessError} change the wallet address`;
      assert.strictEqual(wallet, expected, errMsg);
      await utils.as(owner, sale.changeWallet, saleConf.wallet);
    });

    it('should activate the emergencyFlag.', async () => {
      const sale = await Sale.deployed();
      await utils.as(owner, sale.emergencyToggle);
      const emergencyFlag = await sale.emergencyFlag.call();
      const expected = true;
      const errMsg = `${ownerAccessError} set the emergency toggle`;
      assert.strictEqual(emergencyFlag.valueOf(), expected, errMsg);
      await utils.as(owner, sale.emergencyToggle);
    });
  });
});
