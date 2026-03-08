How to **protect routes from users who haven't completed 2FA** after
onboarding:

## **✅ 1. Backend: Include twoFactorVerified in the session/user payload**

If you\'re using JWT or session-based auth, make sure this field is
returned anywhere user data is fetched:

return {

id: user.id,

email: user.email,

hasPassword: !!user.password,

twoFactorVerified: user.twoFactorVerified,

};



## **✅ 2. Frontend: Protect routes using middleware or checks**

### **Option A: Redirect inside page-level useEffect()**

****useEffect(() =\> {

if (user && !user.twoFactorVerified) {

router.push(\'/verify-2fa\');

}

}, \[user\]);



### **Option B: Create a Higher Order Component (HOC)**

****// withTwoFactorProtection.tsx

const withTwoFactorProtection = (Component) =\> {

return function Wrapped(props) {

const router = useRouter();

const { user } = useUser(); // however you\'re loading session

useEffect(() =\> {

if (user && !user.twoFactorVerified) {

router.push(\'/verify-2fa\');

}

}, \[user\]);

if (!user \|\| !user.twoFactorVerified) return null; // or loading state

return \<Component {\...props} /\>;

};

};

export default withTwoFactorProtection;

Use it like:

export default withTwoFactorProtection(MyProtectedPage);



## **✅ 3. Bonus: Backend Guard (NestJS)**

If you want to restrict access at the API level too:

import {

CanActivate,

ExecutionContext,

Injectable,

UnauthorizedException,

} from \'@nestjs/common\';

\@Injectable()

export class TwoFactorGuard implements CanActivate {

canActivate(context: ExecutionContext): boolean {

const request = context.switchToHttp().getRequest();

const user = request.user;

if (!user?.twoFactorVerified) {

throw new UnauthorizedException(\'2FA required\');

}

return true;

}

}

Use it like:

@UseGuards(AuthGuard(\'jwt\'), TwoFactorGuard)

\@Get(\'secure-data\')

getSecureStuff() {

return { secret: \'🌶️🌶️🌶️\' };

}


