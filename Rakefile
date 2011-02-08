task :dist do
  begin
    require 'sprockets'
  rescue ::LoadError
    raise "You do not have the sprockets gem installed."
  end

  sec = Sprockets::Secretary.new(
    :load_path => ["src"],
    :source_files => ["src/monocle.js"]
  )
  out = sec.concatenation

  begin
    require 'yui/compressor'
    compressor = YUI::JavaScriptCompressor.new(:munge => true)
    out = compressor.compress(out)
  rescue ::LoadError
    puts "You do not have the yui-compressor gem installed; " +
      "compression phase skipped."
  end

  require 'fileutils'
  FileUtils.mkdir_p('dist')
  File.open(File.join('dist', 'monocle-min.js'), 'w') { |f|
    f.write(out)
  }
end

task :default => :dist
