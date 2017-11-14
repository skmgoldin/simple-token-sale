/* eslint-env mocha */
/* global artifacts assert contract */

const fs = require('fs');
const BN = require('bn.js');
const HttpProvider = require('ethjs-provider-http');
const EthRPC = require('ethjs-rpc');
const EthQuery = require('ethjs-query');
const utils = require('./utils');

const Sale = artifacts.require('./Sale.sol');
const HumanStandardToken = artifacts.require('./HumanStandardToken.sol');

const ethRPC = new EthRPC(new HttpProvider('http://localhost:7545'));
const ethQuery = new EthQuery(new HttpProvider('http://localhost:7545'));

const preBuyersConf = JSON.parse(fs.readFileSync('./conf/preBuyers.json'));
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

  describe('Initial token issuance', () => {
    const wrongTokenBalance = 'has an incorrect token balance.';

    it('should instantiate preBuyers with the proper number of tokens', () =>
      Promise.all(
        Object.keys(preBuyersConf).map(async (curr) => {
          const tokenBalance =
            await utils.getTokenBalanceOf(preBuyersConf[curr].address);
          const expected = preBuyersConf[curr].amount;
          const errMsg = `A pre-buyer ${wrongTokenBalance}`;
          assert.strictEqual(
            tokenBalance.toString(10), expected.toString(10), errMsg,
          );
        }),
      ),
    );

    it('should instantiate disburser contracts with the proper number of tokens', async () =>
      Promise.all(
        utils.getTimelockedBeneficiaries().map(async (beneficiary) => {
          const beneficiaryTranches = utils.getTranchesForBeneficiary(beneficiary.address);
          return Promise.all(
            Object.keys(beneficiaryTranches).map(async (tranchIndex) => {
              const tranch = beneficiary.tranches[tranchIndex];
              const disburser =
                utils.getDisburserByBeneficiaryAndTranch(beneficiary.address, tranch);
              const tokenBalance = await utils.getTokenBalanceOf(disburser.address);
              const expected = tranch.amount;
              const errMsg = `A disburser contract ${wrongTokenBalance}`;
              assert.strictEqual(
                tokenBalance.toString(10), expected.toString(10), errMsg,
              );
            }),
          );
        }),
      ),
    );

    it('should instantiate the public sale with the total supply of tokens ' +
       'minus the sum of tokens pre-sold.', async () => {
      const tokenBalance = await utils.getTokenBalanceOf(Sale.address);
      const expected = tokensForSale.toString(10);
      const errMsg = `The sale contract ${wrongTokenBalance}`;
      assert.strictEqual(
        tokenBalance.toString(10), expected.toString(10), errMsg,
      );
    });
  });

  describe('Instantiation', () => {
    const badInitialization = 'was not initialized properly';

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

  describe('Owner-only functions', () => {
    const nonOwnerAccessError = 'A non-owner was able to';
    const ownerAccessError = 'An owner was unable able to';

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

  describe('Pre-sale period', () => {
    const earlyPurchaseError = ' was able to purchase tokens early';

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

  describe('Filters and disbursers', () => {
    function signerAccessFailureFor(address) {
      return `WARNING: could not unlock account ${address}.\n` +
             'This is probably because this beneficiary\'s private key is not generated \n' +
             'by the same mnemonic utils.as your owner privKey. This is probably fine, but \n' +
             'it means we can\'t run this test.';
    }

    it('Should not allow beneficiarys to withdraw tokens before the vesting date', async () =>
      Promise.all(
        utils.getTimelockedBeneficiaries().map(async (beneficiary) => {
          const disbursers = utils.getDisbursersForBeneficiary(beneficiary.address);
          return Promise.all(
            disbursers.map(async (disburser) => {
              try {
                const maxWithdraw =
                  await utils.as(beneficiary.address, disburser.calcMaxWithdraw.call);
                const expected = '0';
                assert.strictEqual(maxWithdraw.toString(10), expected,
                  `Expected maxWithdraw to be zero for ${beneficiary.address}`);
                await utils.as(beneficiary.address, disburser.withdraw, beneficiary.address,
                  maxWithdraw + 1);
                assert(false,
                  `${beneficiary.address} was able to withdraw timelocked tokens early`);
              } catch (err) {
                if (utils.isSignerAccessFailure(err)) {
                  console.log(signerAccessFailureFor(beneficiary.address));
                } else {
                  assert(utils.isEVMException(err), err.toString());
                }
              }
            }),
          );
        }),
      ),
    );

    it('Should allow beneficiarys to withdraw from their disbursers after they vest', async () => {
      function getEVMSnapshot() {
        return new Promise((resolve, reject) => {
          ethRPC.sendAsync({
            method: 'evm_snapshot',
          }, async (snapshotErr, snapshotID) => {
            if (snapshotErr) { reject(snapshotErr); }
            resolve(snapshotID);
          });
        });
      }

      function makeEVMRevert(_snapshot) {
        return new Promise((resolve, reject) => {
          ethRPC.sendAsync({
            method: 'evm_revert',
            params: [_snapshot],
          }, async (revertErr) => {
            if (revertErr) { reject(revertErr); }
            resolve();
          });
        });
      }

      function makeEVMIncreaseTime(seconds) {
        return new Promise((resolve, reject) => {
          ethRPC.sendAsync({
            method: 'evm_increaseTime',
            params: [seconds],
          }, async (increaseTimeErr) => {
            if (increaseTimeErr) { reject(increaseTimeErr); }
            resolve();
          });
        });
      }

      let snapshot = await getEVMSnapshot();

      async function tranchWithdraw(tranches, beneficiary) {
        const tranch = tranches[0];

        await makeEVMRevert(snapshot);
        snapshot = await getEVMSnapshot();
        await makeEVMIncreaseTime(Number.parseInt(tranch.date, 10));

        const beneficiaryStartingBalance = await utils.getTokenBalanceOf(beneficiary.address);
        const disburser =
          utils.getDisburserByBeneficiaryAndTranch(beneficiary.address, tranch);

        try {
          await utils.as(beneficiary.address, disburser.withdraw,
            beneficiary.address, new BN(tranch.amount, 10).toString(10));
          const beneficiaryBalance = await utils.getTokenBalanceOf(beneficiary.address);
          const expected = beneficiaryStartingBalance.add(new BN(tranch.amount, 10));
          const errMsg = 'Beneficiary has an unaccountable balance';
          assert.strictEqual(beneficiaryBalance.toString(10), expected.toString(10), errMsg);
        } catch (err) {
          if (utils.isSignerAccessFailure(err)) {
            console.log(signerAccessFailureFor(beneficiary.address));
          } else {
            throw err;
          }
        }

        if (tranches.length === 1) { return undefined; }
        return tranchWithdraw(tranches.slice(1), beneficiary);
      }

      async function beneficiaryWithdraw(beneficiaries) {
        const beneficiary = beneficiaries[0];
        const tranches = Object.keys(utils.getTranchesForBeneficiary(beneficiary.address))
          .map(tranchIndex => utils.getTranchesForBeneficiary(beneficiary.address)[tranchIndex]);
        await tranchWithdraw(tranches, beneficiary);
        if (beneficiaries.length === 1) { return undefined; }
        return beneficiaryWithdraw(beneficiaries.slice(1));
      }

      await beneficiaryWithdraw(utils.getTimelockedBeneficiaries());
    });
  });
});

