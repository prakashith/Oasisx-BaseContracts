<!-- TITLE: Order Schema Documentation -->
<!-- SUBTITLE: Description of standard order field usage -->

# Order Schema Documentation
## Struct

```javascript
struct Order {
    /* Order registry address. */
    address registry;
    /* Order maker address. */
    address maker;
    /* Order static target. */
    address staticTarget;
    /* Order static selector. */
    bytes4 staticSelector;
    /* Order static extradata. */
    bytes staticExtradata;
    /* Order maximum fill factor. */
    uint256 maximumFill;
    /* Order listing timestamp. */
    uint256 listingTime;
    /* Order expiration timestamp - 0 for no expiry. */
    uint256 expirationTime;
    /* Order salt to prevent duplicate hashes. */
    uint256 salt;
}
```
## Field Descriptions
All of the following fields must be present in an order. Some have special sentinel values.
## Registry
Address	Registry to be used for the call
## Maker	
Address	Order maker, who will execute the call
## StaticTarget	
Address	Target address for predicate function
## StaticSelector	
Bytes4 Selector (hash of function signature) for predicate function
## StaticExtradata	
Bytes Extra data for predicate function
## MaximumFill	
Uint256	Maximum fill, after which the order cannot be matched
## ListingTime	
Uint256	Order listing time, before which the order cannot be matched
## ExpirationTime	
Uint256	Order expiration time, after which the order cannot be matched
## Salt	
Uint256	Order salt for hash deduplication