import React from 'react';

export default function StepIndicator({ disabled, index }: { disabled?: boolean, index: number })  {
  return (
    <button
      disabled={disabled}
      className="peer focus-visible:outline-none size-[25px] rounded-full border-2 inline-flex justify-center items-center shrink-0 text-primary-500 border-primary-500 disabled:text-white disabled:bg-gray-300 disabled:border-gray-300 data-[state=disabled]:text-white data-[state=disabled]:bg-gray-300 data-[state=disabled]:border-gray-300 data-[state=active]:bg-primary-500 data-[state=active]:text-white data-[state=active]:border-primary-500"
    >
      {index+1}
    </button>
  )
}
