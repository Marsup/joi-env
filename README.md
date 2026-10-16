# @marsup/joi-env

Joi extension to read values from environment variables.

Inspired by [`@npmcorp/joi-env`](https://www.npmjs.com/package/@npmcorp/joi-env), which is now deprecated.

## Usage

```js
import BaseJoi from 'joi';
import { JoiEnv } from '@marsup/joi-env';

const Joi = BaseJoi.extend(JoiEnv);

const schema = Joi.object({
    port: Joi.number().env('PORT').default(3000),
    database: Joi.object({
        host: Joi.string().env('DATABASE_HOST').required(),
    }),
});

const config = Joi.attempt({}, schema);
```

Requires joi 18.3.0 or later.

## Behavior

- `.env(key)` is only used when the input value is `undefined`, so a value given explicitly to `validate()` takes precedence, and `.default()` applies when the variable isn't set.
- The variable goes through the schema like any other input, i.e. `'3000'` is converted to a number by `Joi.number()`. With `convert: false`, variables are not read at all.
- A variable that is set but empty is read as `''`. Use `.allow('')` to accept it, or `.empty('')` to treat it as unset and fall back to the default.
- An absent object is created when at least one variable is set among its descendants, `when()` branches included, unless the object is `forbidden()`. Otherwise it stays absent, so mark it `required()` if it must exist.
- Conditions such as `when()` and references are resolved by joi itself, so they see the values read from the environment.
- When combined with other extensions defining `prepare`, extensions declared later run first. Declare `JoiEnv` after the extensions that should see the variables' values.

## License

MIT
