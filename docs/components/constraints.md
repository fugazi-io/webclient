# Constraints

A constraint limits the value of a certain type.  
The implementation of the constraint is done using a javascript function, which is why constraints can only be 
loaded using javascript descriptors.  
The [constraint descriptor](../descriptors/constraint.md) defines on which [types](types.md) the constraint can 
be applied, if it has parameters and the function to invoke for validating the value.

Examples:
```typescript
{
	// ...
	palindrome: {
		types: ["number", "string"],
		validator: () => {
			return function (value: number | string): boolean {
				if (typeof value === "number") {
					if (value % 1 !== 0) {
						return false;
					}
			
					value = value.toString();
				}
			
				if (value.length % 2 === 1) {
					return false;
				}
			
				for (let i = 0; i < value.length / 2; i++) {
					if (value[i] !== value[value.length - i - 1]) {
						return false;
					}
				}
			
				return true;
			}
		}
	}
}
```