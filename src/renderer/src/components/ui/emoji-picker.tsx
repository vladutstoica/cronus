'use client'
import { EmojiPicker as FrimousseEmojiPicker } from 'frimousse'
import * as React from 'react'
import { cn } from '../../lib/utils'

const EmojiPicker = React.forwardRef<
  React.ElementRef<typeof FrimousseEmojiPicker.Root>,
  React.ComponentPropsWithoutRef<typeof FrimousseEmojiPicker.Root>
>(({ className, ...props }, ref) => (
  <FrimousseEmojiPicker.Root
    ref={ref}
    className={cn('flex h-full flex-col', className)}
    {...props}
  />
))
EmojiPicker.displayName = 'EmojiPicker'

const EmojiPickerSearch = React.forwardRef<
  React.ElementRef<typeof FrimousseEmojiPicker.Search>,
  React.ComponentPropsWithoutRef<typeof FrimousseEmojiPicker.Search>
>(({ className, ...props }, ref) => (
  <FrimousseEmojiPicker.Search
    ref={ref}
    className={cn(
      'z-10 mx-2 mt-2 appearance-none rounded-md bg-background px-2.5 py-2 text-sm',
      className
    )}
    {...props}
  />
))
EmojiPickerSearch.displayName = 'EmojiPickerSearch'

const EmojiPickerContent = React.forwardRef<
  React.ElementRef<typeof FrimousseEmojiPicker.Viewport>,
  React.ComponentPropsWithoutRef<typeof FrimousseEmojiPicker.Viewport>
>(({ className, ...props }, ref) => (
  <FrimousseEmojiPicker.Viewport
    ref={ref}
    className={cn('relative flex-1 overflow-hidden', className)}
    {...props}
  >
    <FrimousseEmojiPicker.List
      className="select-none pb-1.5"
      components={{
        CategoryHeader: ({ category, ...categoryProps }) => (
          <div
            className="sticky top-0 z-10 bg-background px-3 pt-3 pb-1.5 font-medium text-muted-foreground text-xs"
            {...categoryProps}
          >
            {category.label}
          </div>
        ),
        Row: ({ children, ...rowProps }) => (
          <div className="scroll-my-1.5 px-1.5" {...rowProps}>
            {children}
          </div>
        ),
        Emoji: ({ emoji, ...emojiProps }) => (
          <button
            className="flex size-8 items-center justify-center rounded-md text-lg data-[active]:bg-accent"
            {...emojiProps}
          >
            {emoji.emoji}
          </button>
        )
      }}
    />
    <FrimousseEmojiPicker.Loading className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
      Loading…
    </FrimousseEmojiPicker.Loading>
    <FrimousseEmojiPicker.Empty className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
      No emoji found.
    </FrimousseEmojiPicker.Empty>
  </FrimousseEmojiPicker.Viewport>
))
EmojiPickerContent.displayName = 'EmojiPickerContent'

const EmojiPickerFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center border-t p-2', className)} {...props} />
  )
)
EmojiPickerFooter.displayName = 'EmojiPickerFooter'

export { EmojiPicker, EmojiPickerContent, EmojiPickerFooter, EmojiPickerSearch }
