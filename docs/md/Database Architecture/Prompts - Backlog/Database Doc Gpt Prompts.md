start with the old name and then give it the new name in the column to
the right, then we need to create a script that will look at every bit
of code in the file system where visual studio stores the files locally,
the script will find the old name and replace it with the new name for
the entire database, and when finished with a file, it will store the
backup of the file (before changes are made) and then save the
current/updated file locally. Every table we use should have a name that
looks like "schema.table" that needs to be referenced.\
For example: hr.tablename, or security.tablename, so it would be
schema.tablename. The table name should reflect the usage of the table.

Need to backup the local code so that we can test the script against the
backup folder while not touching the original, then we can push the
updated files to github.\
\
Before testing, male a backup of current production folders, then test
against the backup folders until everything works correctly, then do a
final refresh (full backup), then run the script against the main set of
folders.\
\
\
We need to have a naming conversion (standardized for all tables) all
devs need to use the same table naming convention. We need a doc (sop)
to walk devs though the standard process of naming new tables. SOP
needed before updating new code and tables.\
\
Include the standard naming doc for reference when asking the AI to
rename all the tables, when generating the script locally.\
\
I need a script to check the existing table names for the correct naming
conventions\
\
I need to add a step in the SOP to check all existing table names
against the naming convention rules and format.
