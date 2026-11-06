# Benchmarks

These benchmarks run separately from CI tests. They use a fixed Chromium viewport
and scenario, warm up before measuring, and save every raw run plus a CPU profile.
Run both revisions on the same machine, browser version, power mode, and display
refresh rate. Close other heavy applications while measuring.

```powershell
$env:BENCH_LABEL = "before"
npm run bench:browser

# Switch to the changed revision, then run again.
$env:BENCH_LABEL = "after"
npm run bench:browser

node benchmarks/compare.mjs before after
```

Results are written to `benchmarks/results/<label>/` and ignored by Git. The
`*.json` files contain each run, medians, revision, browser and CPU, and whether
the working tree was dirty. Open the `*.cpuprofile` files in Chromium DevTools to
inspect hot functions. The comparison rejects different scene, browser, or CPU versions.

`render` runs the demo world plus 140 extra platforms and samples both frame
intervals and the time spent in the engine's render events. Render time is useful
when FPS is capped by the display refresh rate.
`rtree` measures insertion, first/best lookup, and removal with 4,000 fixed
rectangles and 20,000 fixed queries per batch. Each reported run contains four
batches to reduce timer noise. Neither benchmark imposes a pass/fail performance
threshold; overlapping run ranges are flagged in the comparison.
