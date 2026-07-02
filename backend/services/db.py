import os
import uuid

try:
    from pymongo import MongoClient
except ImportError:
    MongoClient = None

MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017')

# Attempt to connect to MongoDB; if unavailable, fall back to in-memory stores for development/demo
try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
    # Force server selection
    client.server_info()
    _db = client.get_database('smart_parking')
    _FALLBACK = False
except Exception:
    _FALLBACK = True

    class Cursor:
        def __init__(self, lst):
            self.lst = list(lst)
        def sort(self, key, direction):
            self.lst.sort(key=lambda x: x.get(key), reverse=(direction == -1))
            return self
        def limit(self, n):
            self.lst = self.lst[:n]
            return self
        def __iter__(self):
            return iter(self.lst)

    class SimpleCollection:
        def __init__(self):
            self.rows = []
        def find_one(self, q):
            for r in self.rows:
                ok = True
                for k, v in q.items():
                    if r.get(k) != v:
                        ok = False
                        break
                if ok:
                    return r
            return None
        def insert_one(self, doc):
            new = dict(doc)
            _id = str(uuid.uuid4())
            new['_id'] = _id
            self.rows.append(new)
            class R: pass
            r = R(); r.inserted_id = _id
            return r
        def update_one(self, q, update):
            for r in self.rows:
                ok = True
                for k, v in q.items():
                    if r.get(k) != v:
                        ok = False
                        break
                if ok:
                    if '$set' in update:
                        r.update(update['$set'])
                    class Res: pass
                    res = Res(); res.matched_count = 1
                    return res
            class Res: pass
            res = Res(); res.matched_count = 0
            return res
        def find(self, q):
            results = []
            for r in self.rows:
                match = True
                for k, v in q.items():
                    if r.get(k) != v:
                        match = False
                        break
                if match:
                    results.append(r)
            return Cursor(results)

    class SimpleDB:
        def __init__(self):
            self.users = SimpleCollection()
            self.reservations = SimpleCollection()
            self.parkings = SimpleCollection()

    _db = SimpleDB()


def get_db():
    return _db
