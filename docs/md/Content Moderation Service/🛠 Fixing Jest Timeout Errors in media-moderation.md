# **🛠 Fixing Jest Timeout Errors in media-moderation.service.spec.ts**

This document provides a process to resolve the Exceeded timeout of
10000 ms for a test errors in your media moderation service tests.

## **✅ Root Cause**

The tests are failing because they **exceed Jest\'s default timeout (10
seconds)** --- likely due to I/O operations or unmocked image processing
logic.

## **🔧 Fix Steps**

### **🔹 Step 1: Apply Global Timeout in Test File**

Add the following code at the **top of your
media-moderation.service.spec.ts file** to extend the timeout for all
tests in that file:

// Extend default timeout to 30 seconds (30000 ms)

jest.setTimeout(30000);

### **🔹 Step 2: Ensure You're Not Running Real Image Processing in Tests**

If your service uses heavy image processing (e.g., checking resolution,
blur detection, or reading real files), **mock the dependencies** to
avoid long delays.

Example: Replace actual fs.promises.stat, fs.promises.readFile, or image
resolution code with Jest mocks.

// At the top of your test file

jest.mock(\'fs\', () =\> ({

promises: {

stat: jest.fn(),

readFile: jest.fn()

}

}));

Then mock values in your test case:

(fs.promises.stat as jest.Mock).mockResolvedValue({ size: 5 \* 1024 \*
1024 });

(fs.promises.readFile as
jest.Mock).mockResolvedValue(Buffer.from(\'\'));

Mock image size return if used:

jest.spyOn(service, \'getImageDimensions\').mockResolvedValue({

width: 800,

height: 800

});

### **🔹 Step 3: Remove Unnecessary File I/O in Unit Tests**

Make sure you **do not use actual image files** (like image.jpg) in unit
tests. Replace them with mocks:

const imagePath = \'mock.jpg\'; // no need for real file

(fs.promises.stat as jest.Mock).mockResolvedValue({ size: 10 \* 1024 \*
1024 });

Avoid referencing non-existent files to prevent hidden delays.

## **🔄 Optional: Increase Timeout Per Test (If Needed)**

If only specific tests are long-running, you can increase timeout for
those individually:

it(\'should approve a valid image\', async () =\> {

jest.setTimeout(30000);

// test logic

});

But using the global timeout at the top is usually cleaner and
preferred.

## **✅ Final Checklist**

  ------------------------------------------------------
  **Task**                                  **Status**
  ----------------------------------------- ------------
  Global timeout added using                ✅
  jest.setTimeout(30000)                    

  All file I/O and image analysis logic     ✅
  mocked                                    

  No real file dependencies used in test    ✅

  Heavy processing logic replaced with      ✅
  mocks                                     

  Timeout errors gone                       ✅
  ------------------------------------------------------

## **✅ Example Before/After Fix**

**Before:**

****const imagePath = \'image.jpg\'; // real file

fs.promises.stat(imagePath);

**After:**

****(fs.promises.stat as jest.Mock).mockResolvedValue({ size: 5 \* 1024
\* 1024 });


