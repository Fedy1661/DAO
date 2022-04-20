# DAO

[Rinkeby](https://rinkeby.etherscan.io/address/0xE9a40356398b2652CbA4b7C19A287d821eD5D3D3)

### Coverage

| Contract | % Stmts | % Branch | % Funcs | % Lines |
|----------|---------|----------|---------|---------|
| DAO      | 100     | 100      | 100     | 100     |

### Documentation

[DAO.sol](https://fedy1661.github.io/DAO/#/contracts/DAO.sol:DAO)

### Deploy

```shell
CHAIRPERSON=ADDRESS VOTE_TOKEN=ADDRESS MINIMUM_QUORUM=AMOUNT DEBATING_PERIOD_DURATION=SECONDS npx hardhat run scripts/deploy.ts
```

### Verification

```shell
npx hardhat verify CONTRACT_ADDRESS CHAIRPERSON_ADDRESS VOTE_TOKEN_ADDRESS MINIMUM_QUORUM DEBATING_PERIOD_DURATION --network rinkeby
```

### Custom tasks

```shell
npx hardhat vote
npx hardhat finish
npx hardhat deposit
npx hardhat addproposal
```

### Examples

```shell
CHAIRPERSON=0xf132AB7E1a93854aa310384ACF65Cf02d19Fc7c3 VOTE_TOKEN=0xc67Dd578404BB01F5F810Bde8b47D047966A4Ec0 MINIMUM_QUORUM=50000 DEBATING_PERIOD_DURATION=36000 npx hardhat run scripts/deploy.ts --network rinkeby
hardhat verify 0xE9a40356398b2652CbA4b7C19A287d821eD5D3D3 0xf132AB7E1a93854aa310384ACF65Cf02d19Fc7c3 0xc67Dd578404BB01F5F810Bde8b47D047966A4Ec0 50000 36000 --network rinkeby
```