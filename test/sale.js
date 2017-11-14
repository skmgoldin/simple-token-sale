/* eslint-env mocha */
/* global artifacts assert contract */

const fs = require('fs');
const BN = require('bn.js');
const HttpProvider = require('ethjs-provider-http');
const EthQuery = require('ethjs-query');
const utils = require('./utils');

const Sale = artifacts.require('./Sale.sol');
const HumanStandardToken = artifacts.require('./HumanStandardToken.sol');

const ethQuery = new EthQuery(new HttpProvider('http://localhost:7545'));

const saleConf = JSON.parse(fs.readFileSync('./conf/sale.json'));
const tokenConf = JSON.parse(fs.readFileSync('./conf/token.json'));

let tokensForSale;

contract('Sale', (accounts) => {
  const [owner, james, miguel, edwhale] = accounts;

  before(() => {
    const tokensPreAllocated = utils.totalPreSoldTokens().add(utils.totalTimelockedTokens());
    saleConf.price = new BN(saleConf.price, 10);
    saleConf.startBlock = new BN(saleConf.startBlock, 10);
    tokenConf.initialAmount = new BN(tokenConf.initialAmount, 10);
    tokensForSale = tokenConf.initialAmount.sub(tokensPreAllocated);
  });

  describe('Sale period 0', () => {
    const balanceError = 'A balance was not utils.as expected following a purchase';

    before(async () =>
      utils.forceMine(saleConf.startBlock),
    );

    it('should not allow the owner to change the price', async () => {
      const sale = await Sale.deployed();
      try {
        await utils.as(owner, sale.changePrice, saleConf.price + 1);
      } catch (err) {
        const errMsg = err.toString();
        assert(utils.isEVMException(err), errMsg);
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

  describe('Emergency stop', () => {
    const purchaseInStopError = ' was able to purchase during the emergency stop';
    const balanceError = 'A balance was not utils.as expected following a purchase';

    before(async () => {
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
        assert(utils.isEVMException(err), errMsg);
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
        assert(utils.isEVMException(err), errMsg);
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
        assert(utils.isEVMException(err), errMsg);
      }
      const finalBalance = await utils.getTokenBalanceOf(edwhale);
      const expected = startingBalance;
      const errMsg = balanceError;
      assert.strictEqual(finalBalance.toString(10), expected.toString(10), errMsg);
    });

    after(async () => {
      const sale = await Sale.deployed();
      await utils.as(owner, sale.emergencyToggle);
    });
  });

  describe('Sale period 1', () => {
    const balanceError = 'A balance was not utils.as expected following a purchase';

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
      assert.strictEqual(
        finalBalance.toString(10), expected.toString(10), errMsg,
      );
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
      assert.strictEqual(
        finalBalance.toString(10), expected.toString(10), errMsg,
      );
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

  describe('Post-sale period', () => {
    const balanceError = 'A balance was not utils.as expected following a purchase';
    const sellOutError = ' was able to purchase when the sale was sold out';

    it('should not transfer 1 token to James.', async () => {
      const startingBalance = await utils.getTokenBalanceOf(james);
      const purchaseAmount = new BN('1', 10);
      try {
        await utils.purchaseTokens(james, purchaseAmount);
        const errMsg = james + sellOutError;
        assert(false, errMsg);
      } catch (err) {
        const errMsg = err.toString();
        assert(utils.isEVMException(err), errMsg);
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
        assert(utils.isEVMException(err), errMsg);
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
        assert(utils.isEVMException(err), errMsg);
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
      const token = HumanStandardToken.at(tokenAddr);
      await utils.as(edwhale, token.transfer, james, transferAmount.toString(10));
      const edwhaleFinalBalance = await utils.getTokenBalanceOf(edwhale);
      const edwhaleExpected = edwhaleStartingBalance.sub(transferAmount);
      const errMsg = balanceError;
      assert.strictEqual(
        edwhaleFinalBalance.toString(10), edwhaleExpected.toString(10), errMsg,
      );
      const jamesFinalBalance = await utils.getTokenBalanceOf(james);
      const jamesExpected = jamesStartingBalance.add(transferAmount);
      assert.strictEqual(
        jamesFinalBalance.toString(10), jamesExpected.toString(10), errMsg,
      );
    });
  });
});

