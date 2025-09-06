import time

cache_store = {}
CACHE_DURATION = 900  # 15 minutes

def get_cached_data(key, fetch_func):
    now = time.time()
    if key in cache_store:
        data, timestamp = cache_store[key]
        if now - timestamp < CACHE_DURATION:
            return data
    data = fetch_func()
    cache_store[key] = (data, now)
    return data
