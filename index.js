var ndns = require('ndns');

module.exports = DNSConfiguration;

function DNSConfiguration(name){
	var self = Object.create(DNSConfiguration.prototype);
	self.name = name;
	self.subs = {};
	self.entries = {};
	return self;
}

DNSConfiguration.prototype.sub = function(){
	for(var i = 0; i < arguments.length; i++){
		this.subs[arguments[i].name] = arguments[i];
	}
	return this;
}

DNSConfiguration.prototype.handle = function(req,res){
	res.header.qr = 1;
	res.header.ra = 1;
	res.header.rd = 0;
	res.header.aa = 1; //autoritativ
	res.header.ancount = 0;
	res.header.nscount = 0;
	res.header.arcount = 0;
	
	for (var i = 0; i < req.q.length; i++){
        res.addQuestion(req.q[i]);		
        var name = req.q[i].name.toLowerCase().split(".").reverse();
		this.recurse(req.q[i],res,name);		
    }	
}

DNSConfiguration.prototype.listen = function(port){
	var self = this;
	this.server = ndns.createServer('udp4');
	this.server.on("request", function(req, res) {
		res.setHeader(req.header);
		self.handle(req,res);
		res.send();
	});
	this.server.bind(port);
}

DNSConfiguration.prototype.recurse = function(question,res,name){

	if(!name.length){
		var entry = this.entries[question.typeName.toLowerCase()];
		if(entry){
			var arr = [question.name.toLowerCase(),1,"IN",question.typeName];
			for(var i = 0; i < entry.length; i++){
				res.addRR.apply(res,arr.concat(entry[i]));
				res.header.ancount++;
			}		
		}
	}else{
		var sub = this.subs[name[0]];	
		if(sub){
			sub.recurse(question,res,name.slice(1));
		}
	}
}

var methods = ["a","ns","mx","soa","srv"];
for(var i = 0; i < methods.length; i++){
	(function(method){
		DNSConfiguration.prototype[method] = function(){
		
			var entries = this.entries[method];
			if(!entries){
				this.entries[method] = entries = [];
			}		
			entries.push(Array.prototype.slice.call(arguments));
			return this;
		}
	})(methods[i]);
}