import sqlite3

conn = sqlite3.connect('GameStats.db')  # You can create a new database by changing the name within the quotes
c = conn.cursor() # The database will be saved in the location where your 'py' file is saved

# Create table - CLIENTS
c.execute('''CREATE TABLE USERS
             ([generated_id] INTEGER PRIMARY KEY,[user_id] text, [display_name] text, [country] text, [points] integer, [rank] integer)''')
          
# Create table - COUNTRY
c.execute('''CREATE TABLE SCORES
             ([generated_id] INTEGER PRIMARY KEY,[display_name] text, [country] text, [points] integer, [rank] integer, [timestamp] date)''')
                 
conn.commit()

# Note that the syntax to create new tables should only be used once in the code (unless you dropped the table/s at the end of the code). 
# The [generated_id] column is used to set an auto-increment ID for each record
# When creating a new table, you can add both the field names as well as the field formats (e.g., Text)