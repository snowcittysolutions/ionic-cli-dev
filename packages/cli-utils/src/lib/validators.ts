import * as chalk from 'chalk';

import { Validator, Validators } from '../definitions';
import { isValidEmail } from './utils/string';

export const validators: Validators = {
  required(input: string, key?: string): boolean | string {
    if (!input) {
      if (key) {
        return `${chalk.bold(key)} must not be empty.`;
      } else {
        return 'Must not be empty.';
      }
    }

    return true;
  },
  email(input: string, key?: string): boolean | string {
    if (!isValidEmail(input)) {
      if (key) {
        return `${chalk.bold(key)} is an invalid email address.`;
      } else {
        return 'Invalid email address.';
      }
    }

    return true;
  },
  numeric(input: string, key?: string): boolean | string {
    if (isNaN(Number(input))) {
      if (key) {
        return `${chalk.bold(key)} must be numeric.`;
      } else {
        return 'Must be numeric.';
      }
    }

    return true;
  },
};

export function combine(...validators: Validator[]): Validator {
  return function(input: string): boolean | string {
    for (let v of validators) {
      let o = v(input);
      if (o !== true) {
        return o;
      }
    }

    return true;
  };
}

export function contains(...values: string[]): Validator {
  return function(input: string, key?: string): boolean | string {
    if (values.indexOf(input) === -1) {
      if (key) {
        return `${chalk.bold(key)} must be one of: (${values.map(v => chalk.bold(v)).join(', ')})`;
      } else {
        return `Must be one of: (${values.map(v => chalk.bold(v)).join(', ')})`;
      }
    }

    return true;
  };
}
