# spdxValidator
check if dependent modules in nodejs app is valid as per spdx list of valid licences.

[npm](https://www.npmjs.com/package/spdxvalidator)

Its this easy:
```
npm i spdxvalidator -g

jarPath="spdx_jar_file_path.jar" spdxValidator
```


# How does it work?

It scan's all licences in current directory node_modules, from's a list of licences, creates a spdx file for it and validate it against the jar file specified. 

It's that simple :)

HI its me [deepak](http://github.com/deepak6446), I don't maintain this package if you want to be a contributer, drop me a mail at deepak.r.poojari@gmail.com.
