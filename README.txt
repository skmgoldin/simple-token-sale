This is the code for the initial AdChain Registry token distribution.

# Initialize
This was developed using Node 7.5.0, Truffle 3.2.4 and TestRPC 3.0.5.

```
npm install
truffle compile
```

# Running the tests
To run the tests, run a TestRPC locally and then run `truffle test`.

Note that you will need to restart the testrpc every time you run the tests, as the tests have a stateful dependency on the block number. In the "Sale period 0" block of tests, the testrpc is force-mined up to the `startBlock` in `conf/sale.json`. If the tests are re-run with the block number already greater than the `startBlock`, tests in the pre-sale period where transactions should fail will end up succeeding, and the tests will not pass as a result.

# Composition of the repo
The repo is composed as a Truffle project. The test suite can be found in `test/sale.json`. The sale contract is in `contracts/Sale.sol`. The deployment scripts are in the `migrations` folder.

The first migration deploys Truffle's own migration contract. The second deploys an ERC-20 token. The third deploys the sale contract and the fourth issues tokens to the sale contract itself and other parties with pre-allocations.

Config files where magic numbers can be fiddled with are in the `conf` directory.

