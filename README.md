# Monocle

A silky, tactile browser-based ebook reader.

Invented by [Inventive Labs](http://inventivelabs.com.au). Released under the
MIT license.

More information (including demos): http://monocle.inventivelabs.com.au

Contributions welcome - fork the repository on
[GitHub](http://github.com/joseph/monocle).


## Getting Monocle

You can download a unified, redistributable version of Monocle 
[from Github](https://github.com/joseph/Monocle/downloads).

The scripts and stylesheets are separated into:

* `monocore` - the essential Monocle functionality
* `monoctrl` - the optional basic controls for page numbers, font-sizing, etc

It's recommended that you develop against the unminified files, to make 
debugging easier. In production, use the minified files.


## Integrating Monocle

Here's the simplest thing that could possibly work.

    <head>
      <!-- Include the Monocle library and styles -->
      <script src="scripts/monocore.js"></script>
      <link rel="stylesheet" type="text/css" href="styles/monocore.css" />
      <style>
        #reader { width: 300px; height: 400px; border: 1px solid #000; }
      </style>
    </head>

    <body>
      <!-- The reader element, with all content to paginate inside it -->
      <div id="reader">
        <h1>Hello world.</h1>
      </div>

      <!-- Instantiate the reader when the containing element has loaded -->
      <script>Monocle.Reader('reader');</script>
    </body>


In this example, we initialise the reader with the contents of the div
itself. In theory there's no limit on the size of the contents of that div.

A more advanced scenario involves feeding Monocle a "book data object", from
which it can lazily load the contents of the book as the user requests it.


## Exploring Monocle

If you want to explore all of Monocle's features, clone this repository and
open `test/index.html` in your browser. This will guide you through Monocle's
tests, which incidentally demonstrate all the major features. View source or
browse the test directory in your text editor for implementation details.


## Connecting Monocle to your book content

For a non-trivial Monocle implementation, your task is to connect the 
Monocle Reader to your book's HTML content and structure. You create 
something called "the book data object" to do this.

The book data object is really pretty simple. You'll find the specification
and some examples in the [Monocle Wiki page on the book data object](https://github.com/joseph/Monocle/wiki/Book-data-object).

For more advanced uses and customisations of Monocle, you should definitely
read the [Monocle Wiki](https://github.com/joseph/Monocle/wiki).


## Browser support

At this time, Monocle aims for full support of all browsers with a
W3C-compliant CSS column module implementation. That is Gecko, WebKit and
Opera at this point. Legacy support is provided for some other browsers,
including recent versions of Internet Explorer. Please encourage your
browser-maker to work on implementing these standards in particular:

* CSS Multi-Column Layout
* W3C DOM Level 2 Event Model
* CSS 2D Transforms (better: 3D Transforms, even better: hardware acceleration)

Monocle has a particular focus on mobile devices. Monocle either supports or
is trying to support:

* iOS 3.1+
* Android 2.0+
* Blackberry 6
* Kindle 3

All these mobile platforms implement columned iframes differently, so support
may be patchy in places, but we're working on it. Patches that improve or
broaden Monocle's browser support are very welcome (but please provide tests).

Inventive Labs would like to thank Ebooq for providing a device to assist with
Android testing.


## Future directions

Monocle has a small set of big goals:

* Faster, more responsive page flipping
* Wider browser support (and better tests, automated as far as possible)
* Tracking spec developments in EPUB and Zhook, supporting where appropriate

We'd also like to provide more implementation showcases in the tests, and
offer more developer documentation in the wiki. 

If you can help out with any of these things, fork away (or contact 'joseph'
on GitHub).


## History

2.3.0 - Smoother transitions and animations in more browsers.

2.2.1 - Slider fixes for better iOS performance.

2.2.0 - Speed, compatibility improvements (esp iOS5, Android, Kindle3).

2.1.0 - Source file reorganisation, Sprockets 2, distributables, wiki.

2.0.0 - Complete rewrite to sandbox content in iframes (the Componentry branch).

1.0.1 - Scrolling flipper, more tests, work on sandboxing in iframe (Framer).

1.0.0 - Initial release.
