/*global web3 describe before artifacts assert it contract:true after*/
const Sale = artifacts.require(`./Sale.sol`);
const Filter = artifacts.require(`./Filter.sol`);
const HumanStandardToken = artifacts.require(`./HumanStandardToken.sol`);
const fs = require(`fs`);
const BN = require(`bn.js`);
const HttpProvider = require(`ethjs-provider-http`);
const EthRPC = require(`ethjs-rpc`);
const EthQuery = require(`ethjs-query`);
const ethRPC = new EthRPC(new HttpProvider(`http://localhost:8545`));
const ethQuery = new EthQuery(new HttpProvider(`http://localhost:8545`));

contract(`Sale`, (accounts) => {
  const preBuyersConf = JSON.parse(fs.readFileSync(`./conf/testPreBuyers.json`));
  const foundersConf = JSON.parse(fs.readFileSync(`./conf/testFounders.json`));
  const saleConf = JSON.parse(fs.readFileSync(`./conf/testSale.json`));
  const tokenConf = JSON.parse(fs.readFileSync(`./conf/testToken.json`));
  const [owner, james, miguel, edwhale] = accounts;

  let tokensForSale;

  /*
   * Utility Functions
   */

  async function purchaseToken(actor, amount) {
    if (!BN.isBN(amount)) { throw new Error(`Supplied amount is not a BN.`); }
    const sale = await Sale.deployed()
    await sale.purchaseTokens({from: actor, value: amount.mul(saleConf.price)})
  }

  async function getTokenBalanceOf(actor) {
    const sale = await Sale.deployed()
    const tokenAddr = await sale.token.call()
    const token = HumanStandardToken.at(tokenAddr)
    const balance = await token.balanceOf.call(actor)
    return new BN(balance.toString(10), 10)
  }

  function totalPreSoldTokens() {
    let tokensPreSold = new BN(`0`, 10);
    Object.keys(preBuyersConf).map((curr, i, arr) => {
      preBuyersConf[curr].amount = new BN(preBuyersConf[curr].amount, 10);
      tokensPreSold = tokensPreSold.add(preBuyersConf[curr].amount);
    });
    return tokensPreSold;
  }

  function totalFoundersTokens() {
    let foundersTokens = new BN(`0`, 10);
    getFounders().map((curr, i, arr) => {
      foundersConf.founders[curr].amount = new BN(foundersConf.founders[curr].amount, 10);
      foundersTokens = foundersTokens.add(foundersConf.founders[curr].amount);
    });
    return foundersTokens;
  }

  async function getFilter(index) {
    const sale = await Sale.deployed()
    const filterAddr = await sale.filters.call(index)
    return Filter.at(filterAddr)
  }

  function getFoundersAddresses() {
    return getFounders().map((curr, i, arr) =>
      foundersConf.founders[curr].address
    );
  }

  function isEVMException(err) {
    return err.toString().includes(`invalid opcode`)
  }

  function getFounders() {
    return Object.keys(foundersConf.founders);
  }

  function forceMine(blockToMine) {
    return new Promise(async (resolve, reject) => {
      if (!BN.isBN(blockToMine)) {
        reject(`Supplied block number must be a BN.`);
      }
      const blockNumber = await ethQuery.blockNumber()
      if (blockNumber.lt(blockToMine)) {
        ethRPC.sendAsync({method: `evm_mine`}, (err) => {
          if (err !== undefined && err !== null) { reject(err); }
          resolve(forceMine(blockToMine));
        });
      } else {
        resolve();
      }
    });
  }

  function numberOfFilters() {
    return Object.keys(foundersConf).length
  }

  before(() => {
    const tokensPreAllocated = totalPreSoldTokens().add(totalFoundersTokens());
    saleConf.price = new BN(saleConf.price, 10);
    saleConf.startBlock = new BN(saleConf.startBlock, 10);
    tokenConf.initialAmount = new BN(tokenConf.initialAmount, 10);
    tokensForSale = tokenConf.initialAmount.sub(tokensPreAllocated);
  });

  describe(`Initial token issuance`, () => {
    it(`should instantiate preBuyers with the proper number of tokens`, () => {
      const wrongBalance =
        `A preBuyer was instantiated with an incorrect token balance`
      Promise.all(
        Object.keys(preBuyersConf).map(async (curr, i, arr) => {
          const tokenBalance =
            await getTokenBalanceOf(preBuyersConf[curr].address)
          const expected = preBuyersConf[curr].amount
          assert.strictEqual(
            tokenBalance.toString(10), expected.toString(10), wrongBalance
          )
        })
      )
    });
    it(`should instantiate disburser contracts with the proper number of tokens`, () => {
      const wrongBalance =
        `A disburser contract was instantiated with an incorrect token balance.`
      const totalDisbursers =
        new BN(Object.keys(foundersConf.vestingDates).length, 10)
      Promise.all(
        Object.keys(foundersConf.vestingDates).map(async (curr, i, arr) => {
          const filter = await getFilter(i)
          const disburserAddr = await filter.disburser.call()
          const tokenBalance = await getTokenBalanceOf(disburserAddr)
          const expected = totalFoundersTokens().div(totalDisbursers)
          assert.equal(
            tokenBalance.toString(10), expected.toString(10), wrongBalance
          )
        })
      )
    });
    it(`should instantiate the public sale with the total supply of tokens ` +
       `minus the sum of tokens pre-sold.`, async () => {
      const wrongBalance =
        `The sale contract was instantiated with an incorrect token balance.`
      const tokenBalance = await getTokenBalanceOf(Sale.address)
      const expected = tokensForSale.toString(10)
      assert.equal(
        tokenBalance.toString(10),
        expected.toString(10),
        wrongBalance
      )
    });
  });
  describe(`Instantiation`, () => {
    it(`should instantiate with the price set to ${saleConf.price} Wei.`, () =>
      new Promise((resolve, reject) =>
        Sale.deployed()
        .then((instance) => instance.price.call())
        .then((price) =>
          resolve(
            assert.equal(price.toString(10), saleConf.price.toString(10),
            `The price was not instantiated properly.`)
          )
        )
        .catch((err) => reject(err))
      )
    );
    it(`should instantiate with the owner set to ${saleConf.owner}.`, () =>
      new Promise((resolve, reject) =>
        Sale.deployed()
        .then((sale) => sale.owner.call())
        .then((owner) =>
          resolve(
            assert.equal(owner.valueOf(), saleConf.owner,
            `The owner was not instantiated properly.`)
          )
        )
        .catch((err) => reject(err))
      )
    );
    it(`should instantiate with the wallet set to ${saleConf.wallet}.`, () =>
      new Promise((resolve, reject) =>
        Sale.deployed()
        .then((sale) => sale.wallet.call())
        .then((wallet) =>
          resolve(
            assert.equal(wallet.valueOf(), saleConf.wallet.toLowerCase(),
            `The wallet was not instantiated properly.`)
          )
        )
        .catch((err) => reject(err))
      )
    );
    it(`should instantiate with the startBlock set to ${saleConf.startBlock}.`, () =>
      new Promise((resolve, reject) =>
        Sale.deployed()
        .then((sale) => sale.startBlock.call())
        .then((startBlock) =>
          resolve(
            assert.equal(startBlock.toString(10),
            saleConf.startBlock.toString(10),
            `The startBlock was not instantiated properly.`)
          )
        )
        .catch((err) => reject(err))
      )
    );
  });

  describe(`Owner-only functions`, () => {
    it(`should not allow James to change the price.`, () =>
      new Promise((resolve, reject) =>
        Sale.deployed()
        .then((sale) => sale.changePrice(saleConf.price + 1, {from: james}))
        .then(() => {
          reject(`A non-owner was able to change the sale price`);
        })
        .catch((err) => Sale.deployed())
        .then((sale) => sale.price.call())
        .then((price) =>
          resolve(
            assert.equal(price.toString(10), saleConf.price.toString(10),
            `A non-owner was able to change the sale price`)
          )
        )
        .catch((err) => reject(err))
      )
    );
    it(`should not allow James to change the startBlock.`, () =>
      new Promise((resolve, reject) =>
        Sale.deployed()
        .then((sale) =>
          sale.changeStartBlock(saleConf.startBlock.add(1), {from: james})
        )
        .then(() => {
          reject(`A non-owner was able to change the sale startBlock`);
        })
        .catch((err) => Sale.deployed())
        .then((sale) => sale.startBlock.call())
        .then((startBlock) =>
          resolve(
            assert.equal(startBlock.toString(10),
            saleConf.startBlock.toString(10),
            `A non-owner was able to change the sale startBlock`)
          )
        )
        .catch((err) => reject(err))
      )
    );
    it(`should not allow James to change the owner.`, () =>
      new Promise((resolve, reject) =>
        Sale.deployed()
        .then((sale) => sale.changeOwner(james, {from: james}))
        .then(() => reject(`A non-owner was able to change the sale owner`))
        .catch((err) => Sale.deployed())
        .then((sale) => sale.owner.call())
        .then((owner) =>
          resolve(
            assert.equal(owner.valueOf(), saleConf.owner,
            `A non-owner was able to change the sale owner`)
          )
        )
        .catch((err) => reject(err))
      )
    );
    it(`should not allow James to change the wallet.`, () =>
      new Promise((resolve, reject) =>
        Sale.deployed()
        .then((sale) => sale.changeWallet(james, {from: james}))
        .then(() => reject(`A non-owner was able to change the wallet`))
        .catch((err) => Sale.deployed())
        .then((sale) => sale.wallet.call())
        .then((wallet) =>
          resolve(
            assert.equal(wallet.valueOf(), saleConf.wallet.toLowerCase(),
            `A non-owner was able to change the sale wallet`)
          )
        )
        .catch((err) => reject(err))
      )
    );
    it(`should not allow James to activate the emergencyToggle.`, () =>
      new Promise((resolve, reject) =>
        Sale.deployed()
        .then((sale) => sale.emergencyToggle({from: james}))
        .then(() => reject(`A non-owner was able to activate the emergencyToggle`))
        .catch((err) => Sale.deployed())
        .then((sale) => sale.emergencyFlag.call())
        .then((res) =>
          resolve(
            assert.equal(res.valueOf(), false,
            `A non-owner was able to activate the emergencyToggle`)
          )
        )
        .catch((err) => reject(err))
      )
    );
    it(`should change the owner to miguel.`, () =>
      new Promise((resolve, reject) =>
        Sale.deployed()
        .then((sale) => sale.changeOwner(miguel, {from: owner}))
        .then(() => Sale.deployed())
        .then((sale) => sale.owner.call())
        .then((owner) =>
          resolve(
            assert.equal(owner.valueOf(), miguel,
            `The owner was not able to change the owner`)
          )
        )
        .catch((err) => reject(err))
      )
    );
    it(`should change the owner back to owner.`, () =>
      new Promise((resolve, reject) =>
        Sale.deployed()
        .then((sale) => sale.changeOwner(owner, {from: miguel}))
        .then(() => Sale.deployed())
        .then((sale) => sale.owner.call())
        .then((owner) =>
          resolve(
            assert.equal(owner.valueOf(), owner,
            `The owner was not able to change the owner`)
          )
        )
        .catch((err) => reject(err))
      )
    );
    it(`should not allow miguel to change the price.`, () =>
      new Promise((resolve, reject) =>
        Sale.deployed()
        .then((sale) => sale.changePrice(saleConf.price.add(1), {from: miguel}))
        .then(() => reject(`A non-owner was able to change the sale price`))
        .catch((err) => Sale.deployed())
        .then((sale) => sale.price.call())
        .then((price) =>
          resolve(
            assert.equal(price.toString(10),
            saleConf.price.toString(10),
            `A non-owner was able to change the sale price`)
          )
        )
        .catch((err) => reject(err))
      )
    );
    it(`should change the price to 2666.`, () =>
      new Promise((resolve, reject) =>
        Sale.deployed()
        .then((sale) => sale.changePrice(new BN(`2666`, 10), {from: owner}))
        .then(() => Sale.deployed())
        .then((sale) => sale.price.call())
        .then((price) =>
          resolve(
            assert.equal(price.toString(10), `2666`,
            `The owner was not able to change the price`)
          )
        )
        .catch((err) => reject(err))
      )
    );
    it(`should change the startBlock to 2666.`, () =>
      new Promise((resolve, reject) =>
        Sale.deployed()
        .then((sale) => sale.changeStartBlock(new BN(`2666`, 10), {from: owner}))
        .then(() => Sale.deployed())
        .then((sale) => sale.startBlock.call())
        .then((startBlock) =>
          resolve(
            assert.equal(startBlock.toString(10), `2666`,
            `The owner was not able to change the sale startBlock`)
          )
        )
        .catch((err) => reject(err))
      )
    );
    it(`should change the startBlock to ${saleConf.startBlock}.`, () =>
      new Promise((resolve, reject) =>
        Sale.deployed()
        .then((sale) => sale.changeStartBlock(saleConf.startBlock, {from: owner}))
        .then(() => Sale.deployed())
        .then((sale) => sale.startBlock.call())
        .then((startBlock) =>
          resolve(
            assert.equal(startBlock.toString(10), saleConf.startBlock,
            `The owner was not able to change the sale startBlock`)
          )
        )
        .catch((err) => reject(err))
      )
    );
    it(`should change the wallet address`, () =>
      new Promise((resolve, reject) => {
        const newWallet = `0x0000000000000000000000000000000000000001`;
        Sale.deployed()
        .then((sale) => sale.changeWallet(newWallet, {from: owner}))
        .then(() => Sale.deployed())
        .then((sale) => sale.wallet.call())
        .then((wallet) => {
          const expectedValue = newWallet;
          assert.equal(wallet, expectedValue,
          `The owner was not able to change the wallet address to 0`);
        })
        .then(() => Sale.deployed())
        .then((sale) => sale.changeWallet(saleConf.wallet, {from: owner}))
        .then(() => Sale.deployed())
        .then((sale) => sale.wallet.call())
        .then((wallet) => {
          const expectedValue = saleConf.wallet.toLowerCase();
          assert.equal(wallet, expectedValue,
          `The owner was not able to change the wallet address to ${saleConf.wallet}`);
        })
        .then(() => resolve())
        .catch((err) => reject(err));
      })
    );
    it(`should activate the emergencyFlag.`, () =>
      new Promise((resolve, reject) =>
        Sale.deployed()
        .then((sale) => sale.emergencyToggle({from: owner}))
        .then(() => Sale.deployed())
        .then((sale) => sale.emergencyFlag.call())
        .then((res) =>
          resolve(
            assert.equal(res.valueOf(), true,
            `The owner was not able to activate the emergencyFlag`)
          )
        )
        .catch((err) => reject(err))
      )
    );
    it(`should deactivate the emergencyFlag.`, () =>
      new Promise((resolve, reject) =>
        Sale.deployed()
        .then((sale) => sale.emergencyToggle({from: owner}))
        .then(() => Sale.deployed())
        .then((sale) => sale.emergencyFlag.call())
        .then((res) =>
          resolve(
            assert.equal(res.valueOf(), false,
            `The owner was not able to deactivate the emergencyFlag`)
          )
        )
        .catch((err) => reject(err))
      )
    );
    it(`should change the price back to ${saleConf.price}.`, () =>
      new Promise((resolve, reject) =>
        Sale.deployed()
        .then((sale) => sale.changePrice(saleConf.price, {from: owner}))
        .then(() => Sale.deployed())
        .then((sale) => sale.price.call())
        .then((price) =>
          resolve(
            assert.equal(price.valueOf(), saleConf.price,
            `The owner was not able to change the sale price`)
          )
        )
        .catch((err) => reject(err))
      )
    );
  });

  describe(`Pre-sale period`, () => {
    it(`should reject a purchase from James.`, () =>
      new Promise((resolve, reject) => {
        let startingBalance;

        getTokenBalanceOf(james)
        .then((balance) => { startingBalance = balance; })
        .then(() => purchaseToken(james, new BN(`420`, 10)))
        .then(() =>
          reject(`James was able to purchase tokens when he ` +
          `should not have been able to.`)
        )
        .catch((err) => getTokenBalanceOf(james))
        .then((balance) =>
          resolve(
            assert.equal(balance.toString(10), startingBalance.toString(10),
            `James was able to purchase tokens in the pre-sale period.`)
          )
        )
        .catch((err) => reject(err));
      })
    );
  });

  describe(`Sale period 0`, () => {
    before(() =>
      new Promise((resolve, reject) =>
        forceMine(saleConf.startBlock)
        .then(() => resolve())
        .catch((err) => reject(err))
      )
    );

    it(`should not allow the owner to change the price`, () =>
      new Promise((resolve, reject) =>
        Sale.deployed()
        .then((sale) => sale.changePrice(new BN(`420`, 10)))
        .then(() =>
          reject(`The owner was able to change the price after the freeze block.`)
        )
        .catch(() => Sale.deployed())
        .then((sale) => sale.price.call())
        .then((res) =>
          resolve(
            assert.equal(res.toString(10), saleConf.price.toString(10),
            `The owner was able to change the price after the freeze block.`)
          )
        )
        .catch((err) => reject(err))
      )
    );
    it(`should transfer 1 token to James.`, () =>
      new Promise((resolve, reject) => {
        let startingBalance;
        const purchaseAmount = new BN(`1`, 10);

        getTokenBalanceOf(james)
        .then((balance) => { startingBalance = balance; })
        .then(() => purchaseToken(james, purchaseAmount))
        .then(() => getTokenBalanceOf(james))
        .then((balance) => {
          const expectedValue = startingBalance.add(purchaseAmount);
          resolve(
            assert.equal(balance.toString(10), expectedValue.toString(10),
            `James was not able to purchase tokens in the sale period.`)
          );
        })
        .catch((err) => reject(err));
      })
    );
    it(`should transfer 10 tokens to Miguel.`, () =>
      new Promise((resolve, reject) => {
        let startingBalance;
        const purchaseAmount = new BN(`10`, 10);

        getTokenBalanceOf(miguel)
        .then((balance) => { startingBalance = balance; })
        .then(() => purchaseToken(miguel, purchaseAmount))
        .then(() => getTokenBalanceOf(miguel))
        .then((balance) => {
          const expectedValue = startingBalance.add(purchaseAmount);
          resolve(
            assert.equal(balance.toString(10), expectedValue.toString(10),
            `Miguel was not able to purchase tokens in the sale period.`)
          );
        })
        .catch((err) => reject(err));
      })
    );
    it(`should transfer 100 tokens to Edwhale.`, () =>
      new Promise((resolve, reject) => {
        let startingBalance;
        const purchaseAmount = new BN(`100`, 10);

        getTokenBalanceOf(edwhale)
        .then((balance) => { startingBalance = balance; })
        .then(() => purchaseToken(edwhale, purchaseAmount))
        .then(() => getTokenBalanceOf(edwhale))
        .then((balance) => {
          const expectedValue = startingBalance.add(purchaseAmount);
          resolve(
            assert.equal(balance.toString(10), expectedValue.toString(10),
            `Edwhale was not able to purchase tokens in the sale period.`)
          );
        })
        .catch((err) => reject(err));
      })
    );
  });

  describe(`Emergency stop`, () => {
    before(() =>
      new Promise((resolve, reject) =>
        Sale.deployed()
        .then((sale) => sale.emergencyToggle({from: owner}))
        .then(() => resolve())
        .catch((err) => reject(err))
      )
    );
    it(`should not transfer 1 token to James.`, () => {
      new Promise((resolve, reject) => {
        let startingBalance;
        const purchaseAmount = new BN(`1`, 10);

        getTokenBalanceOf(james)
        .then((balance) => { startingBalance = balance; })
        .then(() => purchaseToken(james, purchaseAmount))
        .then(() => {
          reject(`James was able to purchase tokens in the emergency stop period.`);
        })
        .catch((err) => getTokenBalanceOf(james))
        .then((balance) => {
          const expectedValue = startingBalance;
          resolve(
            assert.equal(balance.toString(10), expectedValue.toString(10),
            `James was able to purchase tokens in the emergency stop period.`)
          );
        })
        .catch((err) => reject(err));
      });
    });
    it(`should not transfer 10 tokens to Miguel.`, () =>
      new Promise((resolve, reject) => {
        let startingBalance;
        const purchaseAmount = new BN(`10`, 10);

        getTokenBalanceOf(miguel)
        .then((balance) => { startingBalance = balance; })
        .then(() => purchaseToken(miguel, purchaseAmount))
        .then(() => {
          reject(`Miguel was able to purchase tokens in the emergency stop period.`);
        })
        .catch((err) => getTokenBalanceOf(miguel))
        .then((balance) => {
          const expectedValue = startingBalance;
          resolve(
            assert.equal(balance.toString(10), expectedValue.toString(10),
            `Miguel was able to purchase tokens in the emergency stop period.`)
          );
        })
        .catch((err) => reject(err));
      })
    );
    it(`should not transfer 100 tokens to Edwhale.`, () =>
      new Promise((resolve, reject) => {
        let startingBalance;
        const purchaseAmount = new BN(`100`, 10);

        getTokenBalanceOf(edwhale)
        .then((balance) => { startingBalance = balance; })
        .then(() => purchaseToken(edwhale, purchaseAmount))
        .then(() => {
          reject(`Edwhale was able to purchase tokens in the emergency stop period.`);
        })
        .catch((err) => getTokenBalanceOf(edwhale))
        .then((balance) => {
          const expectedValue = startingBalance;
          resolve(
            assert.equal(balance.toString(10), expectedValue.toString(10),
            `Edwhale was able to purchase tokens in the emergency stop period.`)
          );
        })
        .catch((err) => reject(err));
      })
    );
    after(() =>
      new Promise((resolve, reject) =>
        Sale.deployed()
        .then((sale) => sale.emergencyToggle({from: owner}))
        .then(() => resolve())
        .catch((err) => reject(err))
      )
    );
  });

  describe(`Sale period 1`, () => {
    it(`should reject a transfer of tokens to Edwhale greater than the sum ` +
       `of tokens available for purchase.`, () =>
      new Promise((resolve, reject) => {
        let startingBalance;

        getTokenBalanceOf(edwhale)
        .then((balance) => { startingBalance = balance; })
        .then(() => getTokenBalanceOf(Sale.address))
        .then((balance) => {
          const tooMuch = balance.add(new BN(`1`, 10));
          return purchaseToken(edwhale, tooMuch);
        })
        .then(() => {
          reject(`Edwhale was able to purchase more tokens than should be available.`);
        })
        .catch((err) => getTokenBalanceOf(edwhale))
        .then((balance) => {
          const expectedValue = startingBalance;
          resolve(
            assert.equal(balance.toString(10), expectedValue.toString(10),
            `Edwhale was able to purchase more tokens than should be available.`)
          );
        })
        .catch((err) => reject(err));
      })
    );
    it(`should return excess Wei to Edwhale`, () =>
      new Promise((resolve, reject) => {
        let startingBalance;
        let gasPrice;
        let gasUsed;
        let expectedEthDebit;
        let expectedFinalBalance;
        const excessEther = saleConf.price.div(new BN(`2`, 10));

        ethQuery.getBalance(edwhale)
        .then((balance) => { startingBalance = balance; })
        .then(() => ethQuery.gasPrice())
        .then((_gasPrice) => { gasPrice = _gasPrice; })
        .then(() => Sale.deployed())
        .then((sale) =>
          sale.purchaseTokens(
            {from: edwhale,
              value: saleConf.price.add(excessEther),
              gasPrice}
          )
        )
        .then((receipt) => {
          gasUsed = new BN(receipt.receipt.gasUsed, 10);
          expectedEthDebit = gasPrice.mul(gasUsed).add(saleConf.price);
          expectedFinalBalance = startingBalance.sub(expectedEthDebit);
        })
        .then(() => ethQuery.getBalance(edwhale))
        .then((balance) => {
          const expectedValue = expectedFinalBalance;
          resolve(
            assert.equal(balance.toString(10), expectedValue.toString(10),
            `Edwhale's balance is wrong.`)
          );
        })
        .catch((err) => reject(err));
      })
    );
    it(`should transfer all the remaining tokens to Edwhale.`, () =>
      new Promise((resolve, reject) => {
        let saleBalance;
        let startingBalance;

        getTokenBalanceOf(edwhale)
        .then((balance) => { startingBalance = balance; })
        .then(() => getTokenBalanceOf(Sale.address))
        .then((balance) => {
          saleBalance = balance;
          return purchaseToken(edwhale, saleBalance);
        })
        .then(() => getTokenBalanceOf(edwhale))
        .then((balance) => {
          const expectedValue = startingBalance.add(saleBalance);
          resolve(
            assert.equal(balance.toString(10),
            expectedValue.toString(10),
            `Edwhale was able to purchase more tokens than should be available.`)
          );
        })
        .catch((err) => reject(err));
      })
    );
  });

  describe(`Post-sale period`, () => {
    it(`should not transfer 1 token to James.`, () => {
      let startingBalance;
      const purchaseAmount = new BN(`1`, 10);

      return getTokenBalanceOf(james)
      .then((bal) => { startingBalance = bal; })
      .then(() => purchaseToken(james, purchaseAmount))
      .then(() => {
        throw new Error(`James was able ` +
        `to purchase tokens after the sale ended.`);
      })
      .catch((err) => getTokenBalanceOf(james))
      .then((balance) => {
        const expectedValue = startingBalance;
        assert.equal(balance.toString(10), expectedValue.toString(10),
          `James was able to purchase tokens after the sale ended.`);
      });
    });
    it(`should not transfer 10 tokens to Miguel.`, () =>
      purchaseToken(miguel, new BN(`10`, 10))
      .then(() => {
        throw new Error(`Miguel was able ` +
        `to purchase tokens after the sale ended.`);
      })
      .catch((err) => getTokenBalanceOf(miguel))
      .then((balance) => assert.equal(balance.toString(10), `10`, `Miguel was able ` +
        `to purchase tokens after the sale ended.`))
    );
    it(`should not transfer 100 tokens to Edwhale.`, () => {
      let startingBalance;

      return getTokenBalanceOf(edwhale)
      .then((bal) => { startingBalance = bal; })
      .then(() => purchaseToken(edwhale, new BN(`100`, 10)))
      .then(() => {
        throw new Error(`Edwhale was able ` +
        `to purchase tokens after the sale ended.`);
      })
      .catch((err) => getTokenBalanceOf(edwhale))
      .then((bal) => assert.equal(bal.toString(10), startingBalance.toString(10),
        `Edwhale was able to purchase tokens after the sale ended.`));
    });
    it(`should report the proper sum of Wei in the wallet.`, () =>
      ethQuery.getBalance(saleConf.wallet)
      .then((bal) => {
        const expectedBalance = tokensForSale.mul(saleConf.price);
        assert.equal(bal.toString(10), expectedBalance.toString(10),
        `The amount of Ether in the wallet is not what it should be at sale end`);
      })
    );
    it(`should report a zero balance for the sale contract.`, () =>
      getTokenBalanceOf(Sale.address)
      .then((balance) => assert.equal(balance.toString(10), `0`, `The sale ` +
        `ended with tokens still in the sale contract`))
    );
    it(`should allow Edwhale to transfer 10 tokens to James.`, () =>
      new Promise((resolve, reject) => {
        let edwhaleStartingBalance;
        let jamesStartingBalance;
        const transferAmount = new BN(`10`, 10);

        return getTokenBalanceOf(edwhale)
        .then((balance) => { edwhaleStartingBalance = balance; })
        .then(() => getTokenBalanceOf(james))
        .then((balance) => { jamesStartingBalance = balance; })
        .then(() => Sale.deployed())
        .then((instance) => instance.token.call())
        .then((tokenAddr) => HumanStandardToken.at(tokenAddr))
        .then((instance) => instance.transfer(james, transferAmount, {from: edwhale}))
        .then(() => getTokenBalanceOf(edwhale))
        .then((balance) => {
          const expectedEdwhaleBalance = edwhaleStartingBalance.sub(transferAmount);
          assert.equal(balance.toString(10), expectedEdwhaleBalance.toString(10),
          `Edwhale's balance is not as-expected`);
        })
        .then(() => getTokenBalanceOf(james))
        .then((balance) => {
          const expectedJamesBalance = jamesStartingBalance.add(transferAmount);
          assert.equal(balance.toString(10), expectedJamesBalance.toString(10),
          `James' balance is not as-expected`);
        })
        .then(() => resolve())
        .catch((err) => reject(err));
      })
    );
  });

  describe(`Filters and disbursers`, () => {
    const earlyAccessFailure = 'Founder was able to withdraw from a filter ' +
      'earlier than should have been possible'
    const doubleAccessFailure = 'Founder was able to withdraw from a filter ' +
      'they had already withdrawn from'
    const balanceFailure = 'The founder\'s balance was not as expected after ' +
      'interacting with a filter'

    it(`Should not allow founders to withdraw tokens before the vesting date`, async () =>
      await Promise.all(getFoundersAddresses().map(async (founder, i, arr) => {
        const firstFilter = await getFilter(0)
        const secondFilter = await getFilter(1)
        try {
          await firstFilter.claim({from: founder})
          assert(false, earlyAccessFailure)
        } catch(err) {
          assert(isEVMException(err))
        }
        try {
          await secondFilter.claim({from: founder})
          assert(false, earlyAccessFailure)
        } catch(err) {
          assert(isEVMException(err))
        }

        const founderBalance = await getTokenBalanceOf(founder)
        const expectedBalance = new BN(`0`, 10)
        assert.equal(expectedBalance.toString(10), founderBalance.toString(10),
          balanceFailure);
      }))
    );
    it(`Should allow founders to withdraw from the first tranch after that ` +
       `vesting date`, () =>
      new Promise((resolve) => {
        ethRPC.sendAsync({
          method: `evm_increaseTime`,
          params: [34190000] // 13 months in seconds
        }, async (err) => {
          if (err) { throw err; }
          await Promise.all(
            getFounders().map(async (curr, i, arr) => {
              const founder = foundersConf.founders[curr].address
              const firstFilter = await getFilter(0);
              await firstFilter.claim({from: founder})
              const foundersBalance = await getTokenBalanceOf(founder)
              const expectedBalance = foundersConf.founders[curr].amount
                                      .div(new BN(`2`, 10))
              assert.equal(foundersBalance.toString(10),
                           expectedBalance.toString(10),
                           balanceFailure)
              const secondFilter = await getFilter(1);
              try {
                await secondFilter.claim({from: founder})
                assert(false, earlyAccessFailure)
              } catch(err) {
                assert(isEVMException(err))
              }
            })
          )
          resolve()
        })
      })
    );
    it(`Should allow founders to withdraw from the second tranch after that ` +
       `vesting date`, () => 
      new Promise((resolve) => {
        ethRPC.sendAsync({
          method: `evm_increaseTime`,
          params: [18410000] // 7 months in seconds
        }, async (err) => {
          if (err) { throw err; }
          await Promise.all(
            getFounders().map(async (curr, i, arr) => {
              const founder = foundersConf.founders[curr].address
              const firstFilter = await getFilter(0);
              try {
                await firstFilter.claim({from: founder})
                assert(false, doubleAccessFailure)
              } catch(err) {
                assert(isEVMException(err))
              }
              const secondFilter = await getFilter(1);
              await secondFilter.claim({from: founder})
              const foundersBalance = await getTokenBalanceOf(founder)
              const expectedBalance = foundersConf.founders[curr].amount
              assert.equal(foundersBalance.toString(10),
                           expectedBalance.toString(10),
                           balanceFailure)
            })
          )
          resolve()
        })
      })
    );
  });
});
