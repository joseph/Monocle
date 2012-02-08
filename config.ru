# This is the Monocle Rack service. It uses Sprockets to automatically build
# the monocore/monoctrl javascripts and stylesheets on demand. This means
# that all our tests can refer to the distributables, rather than every
# single source file.
#
# The simplest way to use this service is to have Ruby, RubyGems and the
# Rack and Sprockets gems installed, then run:
#
#    rackup
#
# ... from the root directory. Now open http://localhost:9292/test
#
# If you're serious, you could proxy via Apache. I access this service on
# http://monocle.dev locally using ProxyPass rules in an Apache VirtualHost.
#
# Of course, a guiding principle is that you should still be able to
# compile (or download) the distributable into dist/ and open any HTML
# file in a browser directly (by double-clicking it or whatever). But
# in some browsers this will lead to security errors because the file://
# protocol is treated differently.
#

require 'sprockets'

# Rack Builder's map() only works if "HTTP_HOST" matches "SERVER_NAME",
# which is not the case if you are proxying with Apache's ProxyPass.
# Weird. However, if you specify the full URL in the mapping, you
# can circumvent this logic.
#
# The upshot is, any URL you want to access this service on, you need
# to declare in a MONOCLE_HOST envvar when starting Rack. By default,
# that is 'http://monocle.dev' and any direct access (eg, localhost:9292).
#
# https://github.com/rack/rack/issues/14
#
monocle_host = (
  ENV["MONOCLE_HOST"] ?
    ENV["MONOCLE_HOST"].split(',') :
    ['', 'http://monocle.dev']
)

script_env = Sprockets::Environment.new.tap { |e| e.append_path('src') }
style_env = Sprockets::Environment.new.tap { |e| e.append_path('styles') }

monocle_host.each { |host|
  map("#{host}/dist/scripts") { run(script_env) }
  map("#{host}/dist/styles") { run(style_env) }

  map("#{host}/") {
    run(
      proc { |env|
        resp = nil
        path = Rack::Utils.unescape(env['PATH_INFO'])
        index = File.join(Dir.pwd, path, 'index.html')
        if File.exists?(index)
          if path.match(/\/$/)
            env['PATH_INFO'] = File.join(path, 'index.html')
          else
            resp = Rack::Response.new.tap { |r|
              r.redirect("#{path}/", 301)
            }.finish
          end
        end
        resp ||= Rack::Directory.new(Dir.pwd).call(env)
        resp
      }
    )
  }
}
