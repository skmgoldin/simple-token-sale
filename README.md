# Simple Token Launch
This codebase can be used to deploy fixed-price, finite-supply token sales. It uses json conf files to specify sale parameters, supports token distributions for pre-sale buyers, and the distribution of timelocked tokens for founders. It also includes a comprehensive test suite.

# Initialize
This was developed using Node 7.5.0, Truffle 3.2.4 and TestRPC 3.0.5.

```
npm install
truffle compile
```

# Running the tests
To run the tests, run a TestRPC locally with `testrpc -a 100` and then run `truffle test`.

Note that you will need to restart the testrpc every time you run the tests, as the tests have a stateful dependency on the block number. In the "Sale period 0" block of tests, the testrpc is force-mined up to the `startBlock` in `conf/sale.json`. If the tests are re-run with the block number already greater than the `startBlock`, tests in the pre-sale period where transactions should fail will end up succeeding, and the tests will not pass as a result.

# Composition of the repo
The repo is composed as a Truffle project. The test suite can be found in `test/sale.json`. The sale contract is in `contracts/Sale.sol`. The deployment scripts are in the `migrations` folder.

The Sale contract deploys the token contract, disburses funds to pre-sale purchasers and then deploys timelock contracts to store the founders tokens. `Disbursement.sol` and `Filter.sol` comprise the timelock contracts. Two `Disbursement.sol` contracts are deployed which unlock funds at a particular date. The `Filter.sol` contracts sit in front of them and allow particular addresses to withdraw particular amounts of funds.

Config files where magic numbers can be fiddled with are in the `conf` directory.

