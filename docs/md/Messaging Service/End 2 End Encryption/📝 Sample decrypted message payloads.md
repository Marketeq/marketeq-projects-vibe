# **📝 Sample decrypted message payloads**  Use this to **test the truncation logic** on long decrypted messages in the inbox or dropdown. 

****\[

{

\"conversationId\": \"conv-123\",

\"senderName\": \"Anna\",

\"plainText\": \"Just updated the Figma link with the new typography
styles we discussed last week. Let me know if this is aligned with the
mobile breakpoints you were hoping for. Otherwise we can adjust the
padding.\"

},

{

\"conversationId\": \"conv-124\",

\"senderName\": \"Kevin\",

\"plainText\": \"Sent the files over Google Drive instead because
Dropbox was timing out again. Let me know if you can download the ZIP or
if I should split it into smaller folders.\"

},

{

\"conversationId\": \"conv-125\",

\"senderName\": \"Client\",

\"plainText\": \"I think this overall layout is a lot cleaner, but maybe
we should test a few more muted background color options for the callout
sections to see if conversions hold.\"

},

{

\"conversationId\": \"conv-126\",

\"senderName\": \"Project Lead\",

\"plainText\": \"Could you also include the hover animations on the CTA
blocks when you get a chance? The stakeholders liked that effect in the
initial prototype.\"

},

{

\"conversationId\": \"conv-127\",

\"senderName\": \"Emma\",

\"plainText\": \"These placeholder images are just temporary, we can
swap them out once we have final assets. Also the hero headline needs
slight tracking adjustment to look balanced.\"

}

\]



✅ Run the decrypted plainText through:

const snippet = text.length \> 100

? text.slice(0, 100) + \"\...\"

: text;

or CSS:

overflow: hidden;

display: -webkit-box;

-webkit-line-clamp: 2;

-webkit-box-orient: vertical;


