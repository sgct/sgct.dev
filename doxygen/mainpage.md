\mainpage SGCT C++ API reference

This is the generated reference for the public C++ API of
[SGCT](https://github.com/sgct/sgct), the Simple Graphics Cluster Toolkit. It covers every type
declared in the `include/sgct` headers and is regenerated from the sources on each deployment of
[sgct.dev](https://sgct.dev/).

A single umbrella header pulls in everything an application normally needs:

```cpp
#include <sgct/sgct.h>
```

Good places to start are sgct::Engine, which owns the render loop and the callbacks an
application fills in, sgct::Window for per-window state, and the sgct::config namespace, which
mirrors the JSON cluster configuration file.

The narrative documentation lives on the main site: see
[Getting started](https://sgct.dev/docs/building/getting-started) for embedding SGCT in an
application, the [C++ API reference page](https://sgct.dev/docs/building/cpp-api-reference) for an
orientation to the namespaces below, and the
[Configuration reference](https://sgct.dev/docs/reference/configuration) for the JSON side of the
same objects.
