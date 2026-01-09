# Data Directory

This directory stores the SQLite database for cat detection records.

## Files (Not committed to Git)

- `cat_detections.db` - Main database file
- `cat_detections.db-journal` - SQLite journal file

## Database Schema

See `server/services/databaseService.js` for table structure:

- `detections` - All cat detection events
- `statistics` - Daily visit counts

## Note

Database files are excluded from Git (see `.gitignore`) because they contain:
- User data
- Detection history
- Can grow large over time

The database is automatically created when the server starts for the first time.
