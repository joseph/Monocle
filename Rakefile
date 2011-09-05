class MonocleDistributor

  def build(options = {})
    dep("sprockets")

    minified = (
      options[:minify] &&
      dep("yui/compressor", :else => "compression phase skipped")
    )

    sproc = Sprockets::Environment.new
    sproc.append_path("src")

    compressor = YUI::JavaScriptCompressor.new(:munge => true)  if minified
    {
      "monocore.js" => "scripts/monocore.js",
      "monoctrl.js" => "scripts/monoctrl.js"
    }.each { |src, dest|
      out = sproc[src]
      out = compressor.compress(out)  if minified
      distribute(dest, out)
    }

    compressor = YUI::CssCompressor.new  if minified
    sproc.append_path("styles")
    {
      "monocore.css" => "styles/monocore.css",
      "monoctrl.css" => "styles/monoctrl.css"
    }.each { |src, dest|
      out = sproc[src]
      out = compressor.compress(out)  if minified
      distribute(dest, out)
    }
  end


  def package
    @dist_subdir = "pkg"
    {
      "" => false,
      "minified-" => true
    }.inject([]) { |acc, (pkg_type, minified)|
      build(:minify => minified)
      distribute("README.md", IO.read("README.md"))
      manifest = ["scripts/", "styles/", "README.md"]
      pkg_path = "dist/monocle-#{pkg_type}#{release_name}.zip"
      cmd = [
        "cd #{dist_dir} && ",
        "zip -r #{File.expand_path(pkg_path)} #{manifest.join(' ')}"
      ]
      `#{cmd.join}`
      puts "Package: #{pkg_path}"
      FileUtils.rm_rf("dist/pkg")
      acc << pkg_path
    }
  end


  def release
    upload_packages(package)
  end


  def release_tag(tag)
    if `git checkout #{tag}`
      @tag = tag
      upload_packages(package)
      `git checkout master`
    else
      raise "Failed to check out: #{tag}"
    end
  end


  private

    def dep(gem_name, options = {})
      begin
        require(gem_name)
        true
      rescue ::LoadError
        msg = "You do not have the #{gem_name.gsub("/", "-")} gem installed"
        options[:else] ? puts("#{msg}; #{options[:else]}.") : raise("#{msg}.")
        false
      end
    end


    def distribute(filename, str)
      require 'fileutils'
      filepath = File.join(dist_dir, filename)
      FileUtils.mkdir_p(File.dirname(filepath))
      File.open(filepath, 'w') { |f| f.write(str) }
      puts("Wrote: #{filepath}")
    end


    def release_name
      return @tag  if @tag
      out = `git symbolic-ref HEAD 2>/dev/null`
      if $?.success?
        out.sub!(/refs\/heads\//, '').strip!
        out += "-HEAD"
      else
        out = `git describe`.strip
      end
    end


    def upload_packages(pkgs)
      if dep('highline', :else => "no HighLine, no prompts")
        return  unless HighLine.new.agree("Upload these packages to Github?")
      end
      pkgs.reverse.each { |pkg_path|
        min = pkg_path.index('minified') ? 'minified ' : ''
        upload(pkg_path, "Monocle #{min}script @ #{release_name}")
      }
    end


    def upload(file, desc)
      require('cgi')
      dep('net/github-upload')
      login = `git config github.user`.strip
      token = `git config github.token`.strip
      gh = Net::GitHub::Upload.new(:login => login, :token => token)
      opts = {
        :repos => "monocle",
        :content_type => "application/zip",
        :file => file,
        :description => desc
      }
      url = gh.replace(opts)
      puts("Uploaded: #{file} -> #{CGI.unescape(url)}")
    end


    def dist_dir
      dir = ["dist"]
      dir += [@dist_subdir]  if @dist_subdir
      File.join(*dir.flatten)
    end

end



namespace(:build) do

  desc("Build readable, unified scripts and styles into ./dist/")
  task(:readable) do
    MonocleDistributor.new.build
  end

  desc("Build minified, unified scripts and styles into ./dist/")
  task(:minified) do
    MonocleDistributor.new.build(:minify => true)
  end

end

desc("Build readable, unified scripts and styles in to ./dist/")
task(:build => "build:readable")
desc("Build readable, unified scripts and styles in to ./dist/")
task(:default => :build)


desc("Build and zip readable and minified distributions to ./dist/")
task(:pkg) do
  MonocleDistributor.new.package
end


namespace(:release) do

  task(:head) do
    MonocleDistributor.new.release
  end


  task(:tag) do
    raise "Required ENV var: TAG"  unless tag = ENV["TAG"]
    MonocleDistributor.new.release_tag(tag)
  end

end
