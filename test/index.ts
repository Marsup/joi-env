/* oxlint-disable unicorn/no-thenable */
import BaseJoi from 'joi';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { JoiEnv } from '../src/index.js';

const Joi: typeof BaseJoi = BaseJoi.extend(JoiEnv);

describe('env()', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('reads and converts the variable', () => {
        vi.stubEnv('JOI_ENV_PORT', '3000');

        expect(Joi.number().env('JOI_ENV_PORT').validate(undefined)).toEqual({ value: 3000 });
        expect(Joi.object({ port: Joi.number().env('JOI_ENV_PORT') }).validate({})).toEqual({ value: { port: 3000 } });
    });

    it('keeps the input value over the variable', () => {
        vi.stubEnv('JOI_ENV_PORT', '3000');

        expect(Joi.number().env('JOI_ENV_PORT').validate(4000)).toEqual({ value: 4000 });
    });

    it('falls back to the default when the variable is unset', () => {
        expect(Joi.number().env('JOI_ENV_PORT').default(3000).validate(undefined)).toEqual({ value: 3000 });
        expect(Joi.number().env('JOI_ENV_PORT').required().validate(undefined).error).toBeDefined();
    });

    it('reads empty variables as empty strings', () => {
        vi.stubEnv('JOI_ENV_NAME', '');

        expect(Joi.string().env('JOI_ENV_NAME').default('x').validate(undefined).error?.message).toBe(
            '"value" is not allowed to be empty',
        );
        expect(Joi.string().allow('').env('JOI_ENV_NAME').validate(undefined)).toEqual({ value: '' });
        expect(Joi.string().empty('').env('JOI_ENV_NAME').default('x').validate(undefined)).toEqual({ value: 'x' });
    });

    it('ignores the variable without conversion', () => {
        vi.stubEnv('JOI_ENV_PORT', '3000');

        expect(Joi.number().env('JOI_ENV_PORT').validate(undefined, { convert: false })).toEqual({ value: undefined });
    });

    it('creates absent objects only when a descendant has a variable set', () => {
        vi.stubEnv('JOI_ENV_DEEP', 'deep');

        const schema = Joi.object({
            a: Joi.object({
                b: Joi.object({
                    c: Joi.object({
                        d: Joi.object({ deep: Joi.string().env('JOI_ENV_DEEP') }),
                        unset: Joi.object({ value: Joi.string().env('JOI_ENV_UNSET') }),
                    }),
                    unset: Joi.string().env('JOI_ENV_UNSET'),
                }),
            }),
            untouched: Joi.object({ b: Joi.object({ value: Joi.string().env('JOI_ENV_UNSET') }) }),
            plain: Joi.object({ value: Joi.string() }),
        });

        expect(schema.validate({})).toEqual({ value: { a: { b: { c: { d: { deep: 'deep' } } } } } });
    });

    it('does not create forbidden objects', () => {
        vi.stubEnv('JOI_ENV_SHAPE', 'circle');
        vi.stubEnv('JOI_ENV_RADIUS', '1');
        vi.stubEnv('JOI_ENV_SIDE', '2');

        const schema = Joi.object({
            circle: Joi.object({ radius: Joi.number().env('JOI_ENV_RADIUS') }).when('shape', {
                is: 'circle',
                then: Joi.required(),
                otherwise: Joi.forbidden(),
            }),
            square: Joi.object({ side: Joi.number().env('JOI_ENV_SIDE') }).when('shape', {
                is: 'square',
                then: Joi.required(),
                otherwise: Joi.forbidden(),
            }),
            shape: Joi.string().env('JOI_ENV_SHAPE'),
        });

        expect(schema.validate({})).toEqual({ value: { circle: { radius: 1 }, shape: 'circle' } });
    });

    it('reads variables inside when branches', () => {
        vi.stubEnv('JOI_ENV_MODE', 'remote');
        vi.stubEnv('JOI_ENV_URL', 'http://example.com');

        const schema = Joi.object({
            source: Joi.when('mode', {
                switch: [
                    {
                        is: 'local',
                        then: Joi.object({ path: Joi.string().env('JOI_ENV_PATH').default('/tmp') }).default(),
                    },
                    { is: 'remote', then: Joi.object({ url: Joi.string().env('JOI_ENV_URL') }) },
                ],
                otherwise: Joi.object({ other: Joi.string().env('JOI_ENV_OTHER') }),
            }),
            mode: Joi.string().env('JOI_ENV_MODE'),
        });

        expect(schema.validate({})).toEqual({ value: { mode: 'remote', source: { url: 'http://example.com' } } });
        expect(schema.validate({ mode: 'local' })).toEqual({ value: { mode: 'local', source: { path: '/tmp' } } });
    });
});
