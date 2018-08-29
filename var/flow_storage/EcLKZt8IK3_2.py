import json
import sys
inMsg=json.loads(sys.argv[1])

def welcome_me():
   a = {"ab":1,"bc":inMsg["Payload"]["val"]}
   print(json.dumps(a))
welcome_me()