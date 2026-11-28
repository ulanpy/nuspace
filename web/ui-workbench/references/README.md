# References

Material to look at while working in the workbench, and nothing else: code
snippets, screenshots, a spec. Any file type. None of it is rendered and none of
it is imported — the entry globs do not match this folder, so a `.tsx` here is
never mounted as a demo.

Keep it out of the host app's production stylesheet. This folder sits under the
workbench's Vite root, which is Tailwind's automatic source base, so a `.tsx` in
here has its utilities compiled into that stylesheet unless the stylesheet says
otherwise:

```css
@source not "../ui-workbench/references";
```

Name that folder alone. Excluding the workbench itself would strip the utilities
from every workbench file, since rendering those files is the job.

The main README covers how a reference is used, and the skill covers how an
agent should handle one.
