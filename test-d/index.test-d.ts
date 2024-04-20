import { expectType, expectNotType } from 'tsd';
import Axe from '../lib';

const logger = new Axe({});

expectType<Axe.Constructor>(Axe);
expectType<Axe.Axe>(logger);

// We can expect that the logger object has all the methods of the Console object except 'config' and 'log' and expected levels
expectType<Console['assert']>(logger.assert);
expectType<Console['count']>(logger.count);
expectType<Console['table']>(logger.table);
expectNotType<Console['log']>(logger.log);
