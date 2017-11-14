/* eslint-env mocha */
/* global assert contract */

const fs = require('fs');
const BN = require('bn.js');
const HttpProvider = require('ethjs-provider-http');
const EthRPC = require('ethjs-rpc');
const utils = require('./utils');

const ethRPC = new EthRPC(new HttpProvider('http://localhost:7545'));

const saleConf = JSON.parse(fs.readFileSync('./conf/sale.json'));
const tokenConf = JSON.parse(fs.readFileSync('./conf/token.json'));

contract('Sale', () => {
  describe('Filters and disbursers', () => {
    before(() => {
      saleConf.price = new BN(saleConf.price, 10);
      saleConf.startBlock = new BN(saleConf.startBlock, 10);
      tokenConf.initialAmount = new BN(tokenConf.initialAmount, 10);
    });

    function signerAccessFailureFor(address) {
      return `WARNING: could not unlock account ${address}.\n` +
             'This is probably because this beneficiary\'s private key is not generated \n' +
             'by the same mnemonic utils.as your owner privKey. This is probably fine, but \n' +
             'it means we can\'t run this test.';
    }

    it('Should not allow beneficiarys to withdraw tokens before the vesting date', async () =>
      Promise.all(utils.getTimelockedBeneficiaries().map(async (beneficiary) => {
        const disbursers = utils.getDisbursersForBeneficiary(beneficiary.address);
        return Promise.all(disbursers.map(async (disburser) => {
          try {
            const maxWithdraw =
                  await utils.as(beneficiary.address, disburser.calcMaxWithdraw.call);
            const expected = '0';
            assert.strictEqual(
              maxWithdraw.toString(10), expected,
              `Expected maxWithdraw to be zero for ${beneficiary.address}`,
            );
            await utils.as(
              beneficiary.address, disburser.withdraw, beneficiary.address,
              maxWithdraw + 1,
            );
            assert(
              false,
              `${beneficiary.address} was able to withdraw timelocked tokens early`,
            );
          } catch (err) {
            if (utils.isSignerAccessFailure(err)) {
              console.log(signerAccessFailureFor(beneficiary.address));
            } else {
              assert(utils.isEVMException(err), err.toString());
            }
          }
        }));
      })));

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
          await utils.as(
            beneficiary.address, disburser.withdraw,
            beneficiary.address, new BN(tranch.amount, 10).toString(10),
          );
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

