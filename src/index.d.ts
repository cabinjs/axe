export default Axe;

declare const Axe: Axe.Constructor;

declare namespace Axe {
  // These should match the defaults in the index file
  namespace Defaults {
    type OmittedLoggerKeys = 'config' | 'log';
    type Levels = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  }

  export type Constructor = new <TLogger extends Logger = Console>(
    config?: Options<TLogger>
  ) => Axe<TLogger>;

  export type Axe<TLogger extends Logger = Console> = ParentLogger<TLogger> &
    Prototype &
    LoggerMethods &
    LoggerMethodAliases;

  // This is the inherited methods from the logger object
  export type ParentLogger<T extends Logger> = Omit<
    {
      [K in Exclude<keyof T, Defaults.OmittedLoggerKeys>]: T[K];
    },
    Defaults.Levels
  >;

  export type LoggerMethod = (...args: any[]) => Promise<void>;

  export type LoggerMethods = {
    [K in Defaults.Levels]: LoggerMethod;
  };

  export type LoggerMethodAliases = {
    err: LoggerMethods['error'];
    warning: LoggerMethods['warn'];
  };

  export type Prototype = {
    log: (...args: any[]) => Promise<void>;

    setLevel(leveL: string): void;
    getNormalizedLevel(level: string): string;
    setName(name: string): void;
    pre(level: string, fn: PreHook): void;
    post(level: string, fn: PostHook): void;
  };

  export type Logger<
    ObjectType = {
      info?: (...args: any[]) => any;
      log?: (...args: any[]) => any;
    },
    KeysType extends keyof ObjectType = keyof ObjectType
  > =
    // Require at least one of the keys
    {
      [Key in KeysType]-?: Required<Pick<ObjectType, Key>> &
        Partial<Pick<ObjectType, Exclude<KeysType, Key>>>;
    }[KeysType] &
      Record<string, any>;

  /**
   * A pre-hook is a function that runs before the logger method is invoked.
   * It receives the method name, error, message, and metadata as arguments.
   * It should return an array of the error, message, and metadata.
   *
   * @param method - The method name that will be invoked (e.g. 'info', 'warn', 'error', 'fatal')
   * @param err - The error object (if any)
   * @param message - The message to log (if any)
   * @param meta - The metadata object to log (if any)
   *
   * @returns An array of the error, message, and metadata
   */
  export type PreHook = (
    method: string,
    err: any,
    message: any,
    meta: any
  ) => [any, any, any];

  /**
   * A post-hook is a function that runs after the logger method is invoked.
   *
   * @param method - The method name that was invoked (e.g. 'info', 'warn', 'error', 'fatal')
   * @param err - The error object (if any)
   * @param message - The message that was logged (if any)
   * @param meta - The metadata object that was logged (if any)
   */
  export type PostHook = (
    method: string,
    err: any,
    message: any,
    meta: any
  ) => PromiseLike<any> | any;

  export type Options<TLogger extends Logger> = {
    /**
     * Attempts to parse a boolean value from `process.env.AXE_SHOW_STACK`).
     * **If this value is `true`, then if `message` is an instance of an Error,
     *  it will be invoked as the first argument to logger methods.
     *  If this is `false`, then only the `err.message` will be invoked as the first argument to logger methods.**
     *
     * Basically if `true` it will call `logger.method(err)` and if `false` it will call `logger.method(err.message)`.
     * If you pass `err` as the first argument to a logger method,
     *  then it will show the stack trace via `err.stack` typically.
     *
     * @default true
     */
    showStack?: boolean;

    meta?: {
      /**
       * Attempts to parse a boolean value from `process.env.AXE_SHOW_META`
       *   – meaning you can pass a flag `AXE_SHOW_META=true node app.js` when needed for debugging),
       *      whether or not to output metadata to logger methods.
       * If set to `false`, then fields will not be omitted nor picked;
       *  the entire meta object will be hidden from logger output.
       *
       * @default true
       */
      show?: boolean;

      /**
       * Attempts to parse an Object mapping from `process.env.AXE_REMAPPED_META_FIELDS`
       *   (`,` and `:` delimited, e.g. `REMAPPED_META_FIELDS=foo:bar,beep.boop:beepBoop` to remap `meta.foo` to `meta.bar` and `meta.beep.boop` to `meta.beepBoop`).
       * Note that this will clean up empty objects by default unless you set the option `meta.cleanupRemapping` to `false`).
       * Supports dot-notation.
       *
       * @default {}
       */
      remappedFields?: RemappedFields;

      /**
       * Attempts to parse an array value from `process.env.AXE_OMIT_META_FIELDS`
       *  (`,` delimited) - meaning you can pass a flag `AXE_OMIT_META_FIELDS=user,id node app.js`),
       *  determining which fields to omit in the metadata passed to logger methods.
       * Supports dot-notation.
       *
       * @default []
       */
      omittedFields?: string[];

      /**
       * Attempts to parse an array value from `process.env.AXE_PICK_META_FIELDS`
       *  (`,` delimited) - meaning you can pass a flag, e.g. `AXE_PICK_META_FIELDS=request.headers,response.headers node app.js`
       *    which would pick from `meta.request` and `meta.response` *only* `meta.request.headers` and `meta.response.headers`),
       * **This takes precedence after fields are omitted, which means this acts as a whitelist.**
       * Supports dot-notation.
       * **As of v11.2.0 this now supports Symbols, but only top-level symbols via `Reflect.ownKeys` (not recursive yet).**
       *
       * @default []
       */
      pickedFields?: Array<string | symbol>;

      /**
       * Whether or not to cleanup empty objects after remapping operations are completed)
       *
       * @default true
       */
      cleanupRemapping?: boolean;

      /**
       * Whether to suppress HTTP metadata (prevents logger invocation with second arg `meta`)
       *  if `meta.is_http` is `true` (via [parse-request][] v5.1.0+).
       * If you manually set `meta.is_http = true` and this is `true`, then `meta` arg will be suppressed as well.
       *
       * @default true
       */
      hideHTTP?: boolean;

      /**
       * If this value is provided as a String, then if `meta[config.hideMeta]` is `true`,
       *  it will suppress the entire metadata object `meta` (the second arg) from being passed/invoked to the logger.
       * This is useful when you want to suppress metadata from the logger invocation,
       *  but still persist it to post hooks (e.g. for sending upstream to your log storage provider).
       * This helps to keep development and production console output clean while also allowing you to still store the meta object.
       *
       * @deafult 'hide_meta'
       */
      hideMeta?: string | boolean;
    };

    /**
     * Whether or not to invoke logger methods. Pre and post hooks will still run even if this option is set to `false`.
     *
     * @default false
     */
    silent?: boolean;

    /**
     * Defaults to `console` with {@link https://github.com/paulmillr/console-polyfill console-polyfill} added automatically, though **you can bring your own logger**.
     * See {@link https://github.com/cabinjs/axe?tab=readme-ov-file#custom-logger custom-logger} – you can pass an instance of `pino`, `signale`, `winston`, `bunyan`, etc.
     *
     * @default console
     */
    logger?: TLogger;

    /**
     * The default name for the logger (defaults to `false` in development environments,
     *  which does not set `logger.name`)
     *    – this is useful if you are using a logger like `pino` which prefixes log output with the name set here.
     *
     * @default `false` if `NODE_ENV` is `"development"` otherwise the value of `process.env.HOSTNAME` or `os.hostname()`
     */
    name?: string | boolean;

    /**
     * The default level of logging to invoke `logger` methods for (defaults to `info`,
     *  which includes all logs including info and higher in severity (e.g. `info`, `warn`, `error`, `fatal`)
     *
     * @default 'info'
     */
    level?: string;

    /**
     * An Array of logging levels to support.
     * You usually shouldn't change this unless you want to prevent logger methods from being invoked or prevent hooks from being run for a certain log level.
     * If an invalid log level is attempted to be invoked, and if it is not in this Array, then no hooks and no logger methods will be invoked.
     *
     * @default ['info','warn','error','fatal']
     */
    levels?: string[];

    /**
     * Attempts to parse a boolean value from `process.env.AXE_APP_INFO`) - whether or not to parse application information (using [parse-app-info][]).
     *
     * @default true
     */
    appInfo?: boolean;

    /**
     * See {@link https://github.com/cabinjs/axe?tab=readme-ov-file#hooks Hooks}
     *
     * @defualt { pre: [], post: [] }
     */
    hooks?: {
      pre?: PreHook[];
      post?: PostHook[];
    };
  };

  type RemappedFields = {
    [key: string]: string | RemappedFields;
  };
}
