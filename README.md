# How to update Shopify

## Be careful when to use upstream and origin

```
git checkout shopify
# check your remote:
git remote -v
# if you don't have upstream: git remote add upstream https://github.com/Shopify/dawn.git
git pull upstream main
git push origin shopify
```

Create a new branch which could be merged to our `origin main`
