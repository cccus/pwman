/*
Copyright (C) 2019  Josef Neiß

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>
*/

const crypto = require("crypto")
const clipboardy = require('clipboardy')
const fs = require('fs')
const term = require( 'terminal-kit' ).terminal

var config = {items: [],master: null,copyToClipboard: true}
var enableMenu = false
var master = null

class Item {
    constructor(alias,data,password,){
        this.alias = alias;
        this.data = encrypt(data, password);;
    }
}

function saveConfig(){
    fs.writeFileSync('config.json',JSON.stringify(config))
}

function loadConfig(){
    if(fs.existsSync('config.json')){
        config = JSON.parse(fs.readFileSync('config.json'))
    }else{
        saveConfig()
    }
}

function generatePassword(length){
    var pass = ""
    for(var i=0;i<length;i++){
        switch(Math.floor(Math.random()*3)){
            //lowercase letters
            case 0: 
                pass += String.fromCharCode(Math.floor(Math.random() * 25) + 97); 
            break;
            //uppercase letters
            case 1: 
                pass += String.fromCharCode(Math.floor(Math.random() * 25) + 65); 
            break;
            //numbers
            case 2: 
                pass += String.fromCharCode(Math.floor(Math.random() * 10) + 48); 
            break;
        }
        
    }
    return pass
}

function encrypt(data,password) {
    var cipher = crypto.createCipher('aes-256-ecb', password);
    return cipher.update(data, 'utf8', 'hex') + cipher.final('hex');
  }
  
function decrypt(data,password) {
    var cipher = crypto.createDecipher('aes-256-ecb', password);
    return cipher.update(data, 'hex', 'utf8') + cipher.final('utf8');
}

function terminate() {
	term.grabInput( false ) ;
	setTimeout( function() { process.exit() } , 100 ) ;
}

loadConfig()
term.grabInput( { mouse: 'button' } ) ;
term.clear()

function checkMaster(){
    term('Master password: ')
    term.inputField((err,input)=>{
        term.clear()
        
        if(config.master == null){
            config.master = encrypt(input,input)
            saveConfig()
        }
        
        try{
            if(input == decrypt(config.master,input)){
                master = input
                menu()
            }
        }catch(e){
            term('wrong master password\n')
            terminate()
        }
    })

}

function menu(){
    term.clear()
    term.moveTo(0,0)
    //term('').magenta('l').white('ist ').magenta('a').white('dd ').magenta('d').white('elete ').magenta('e').white('dit\n')
    term('l: list x: listall a: add d: delete e: edit g: generate\n')
    enableMenu = true
}

function add(data = null){
    term('Alias: ')
    term.inputField((err,alias)=>{
        if(data != null){
            config.items.push(new Item(alias,data,master))
            saveConfig()
            menu()
            if(config.copyToClipboard)
                clipboardy.writeSync(data)
            term.green(alias+'\n')
            term(data+'\n')
        }else{
            term('\nData: ')
            term.inputField((err,data)=>{    
                config.items.push(new Item(alias,data,master))
                saveConfig()
                menu()
                term.green(`Added ${alias}.\n`)
            })    
        }
    })
}

function edit(){
    if(config.items.length == 0){
        menu()
        term.red('nothing to edit.')
        return
    }
   term.singleColumnMenu(config.items.map(x=>x.alias),{y:1},(err,res)=>{
        term('Alias: ')
        term.inputField((err,alias)=>{
            term('\nData: ')
            term.inputField((err,data)=>{
                config.items[res.selectedIndex] = new Item(alias,data,master)
                saveConfig()
                menu()
                term.green(`Edited ${alias}.\n`)
            })
        })
    });
}

function list(){
    if(config.items.length == 0){
        menu()
        term.red('nothing to list.')
        return
    }
    term.singleColumnMenu(config.items.map(x=>x.alias),{y:1},(err,res)=>{
        var item = config.items[res.selectedIndex]
        
        menu()
        term.green(item.alias+'\n')
        try{
            var data = decrypt(item.data,master)
            if(config.copyToClipboard)
                clipboardy.writeSync(data)
            term(data+'\n')
        }catch(e){
            term.red('wrong password\n')
        }
    });
}

function listAll(){
    if(config.items.length == 0){
        menu()
        term.red('nothing to list.')
        return
    }
    menu()
    for(var i of config.items){
        term.green(i.alias+'\n')
        term(decrypt(i.data,master)+'\n')                
    }
}

function remove(){
    if(config.items.length == 0){
        menu()
        term.red('nothing to delete.')
        return
    }
        
    term.singleColumnMenu(config.items.map(x=>x.alias),{y:1},(err,res)=>{
        config.items.splice(res.selectedIndex,1)
        saveConfig()
        menu()
        term.red(res.selectedText+' deleted.\n')
    });
}

checkMaster()


term.on( 'key' , function( name , matches , data ) {
    if(name == "CTRL_C"){
        terminate()
    }
    
    if(!enableMenu)
        return

    term.clear()
    enableMenu = false
	switch(name){
        case 'l': list(); break;
        case 'd': remove(); break;
        case 'a': add(); break;
        case 'e': edit(); break;
        case 'x': listAll(); break;
        case 'q': terminate(); break;
        case 'g': add(generatePassword(30)); break;
        default:
        break;
    }
} ) ;


