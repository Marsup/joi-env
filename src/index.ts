import type { Extension, Schema } from 'joi';

declare module 'joi' {
    interface AnySchema {
        /** Reads the value from the given environment variable when the input value is undefined. */
        env(key: string): this;
    }
}

const envKeysCache = new WeakMap<Schema, string[]>();

const hasEnv = (key: string): boolean => Object.hasOwn(process.env, key);

/** Lists the environment variables referenced by a schema and its descendants, all `when` branches included. */
const getEnvKeys = (schema: Schema | undefined): string[] => {
    if (!schema) {
        return [];
    }

    const cached = envKeysCache.get(schema);
    if (cached) {
        return cached;
    }

    const keys: string[] = [];
    const own: string | undefined = schema.$_getFlag('env');
    if (own !== undefined) {
        keys.push(own);
    }

    for (const child of schema.$_terms.keys ?? []) {
        keys.push(...getEnvKeys(child.schema));
    }

    for (const when of schema.$_terms.whens ?? []) {
        for (const branch of [when, ...(when.switch ?? [])]) {
            keys.push(...getEnvKeys(branch.then), ...getEnvKeys(branch.otherwise));
        }
    }

    envKeysCache.set(schema, keys);
    return keys;
};

export const JoiEnv: Extension = {
    type: /^/,
    prepare: {
        undefined: true,
        method(value, { schema }) {
            if (value !== undefined) {
                return undefined;
            }

            const key: string | undefined = schema.$_getFlag('env');
            if (key !== undefined) {
                return hasEnv(key) ? { value: process.env[key] } : undefined;
            }

            // An absent object is only created when one of its descendants has a value to read, otherwise
            // optional objects would always appear and forbidden ones would always fail
            if (
                schema.type === 'object' &&
                schema.$_getFlag('presence') !== 'forbidden' &&
                getEnvKeys(schema).some(hasEnv)
            ) {
                return { value: {} };
            }

            return undefined;
        },
    },
    rules: {
        env: {
            method(key: string) {
                return this.$_setFlag('env', key);
            },
        },
    },
};
