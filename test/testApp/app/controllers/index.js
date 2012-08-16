module.exports = function(app){ return {
	home : function(app){ return {index : function(req,res){ res.send('hello, world!')}}}
}};