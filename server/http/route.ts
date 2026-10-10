import {canManageRentia,getRentiaUser} from '../../lib/session';
import {publicOrigin} from '../../lib/public-origin';
import {createRoute} from './handler';

export {HttpError,assertOrigin,validate} from './handler';

export const route=createRoute({getUser:getRentiaUser,canManage:canManageRentia,configuredOrigin:publicOrigin});
