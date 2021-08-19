# token-api
Api for token information sites to get the values that they need to evaluate token metrics.


### GET /cmk/circulating_supply_raw

returns ONLY the number of the circulating supply of CMK.

Currently this is the total supply (`totalSupply()`) minus the `balanceOf()` for all locked addresses.

Locked addresses are vesting contracts, the unallocated tokens from the vesting contract setup address, and the community treasury.