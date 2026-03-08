### **✅ Issue Summary**

#### **1. Build Warnings**

- **Warning:** Conflict between package-lock.json (npm) and yarn.lock.

- **Cause:** Your render.yaml specifies yarn start:prod, but
  package-lock.json suggests npm was used locally.

- **Fix:** Commit to one package manager --- in this case, **Yarn**.

#### **2. Application Error**

- **Error:** Node.js application **ran out of memory** during the build.

- **Cause:** Monorepo or heavy compilation task exceeded the memory
  limits on Render (common with large NestJS apps or microservices).

### **🛠️ Fix Plan**

#### **Step 1: Remove npm artifacts and enforce Yarn**

****rm package-lock.json

rm -rf node_modules

yarn install

- \
  Commit the updated yarn.lock and remove package-lock.json from your
  repo.

- Add .npmrc to prevent npm fallback:

package-lock=false

#### **Step 2: Use Build Command Override (in render.yaml)**

If you\'re using a monorepo, customize the buildCommand to be
memory-efficient:

buildCommand: \|

yarn install \--frozen-lockfile

NODE_OPTIONS=\"\--max_old_space_size=2048\" yarn build

> \--max_old_space_size=2048 increases the Node.js memory allocation to
> 2GB.

#### **Step 3: (Optional) Split Build Work**

If your build is still failing:

- Pre-build locally and commit production artifacts.

- Or, modularize the monorepo further to reduce build complexity.

### **🧪 Recommended Debug Check**

Once deployed, in the Render dashboard:

- Check the **Logs tab** during both build and runtime.

- Confirm the app is starting via yarn start:prod.
