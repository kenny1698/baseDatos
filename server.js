const express = require('express')
const { Server: HttpServer } = require('http')
const { Server: IOServer } = require('socket.io')
const moment = require('moment'); 
const { optionsMySQL } = require( './options/DBs.js')
const { optionsSQLite } = require( './options/DBs.js')
const Contenedor = require('./src/contenedores/Contenedor.js');
const { json } = require('express');

const contChat = new Contenedor(optionsSQLite)
const contProd = new Contenedor(optionsMySQL)

const fecha = moment().format("DD/MM/YYYY HH:mm:ss"); 


const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
const httpServer = new HttpServer(app)
const io = new IOServer(httpServer)
const productos = []
const mensajes = []

//contChat.start()
//contProd.start()

contProd.getAll('productos')
    .then((result) =>{
        for (const obj in result) {
            productos.push(result[obj])
            }        
    })
    .catch((err) => { console.log(err); throw err })
    .finally(() => {
        //contProd.close()
    })

contChat.getAll('chat')
    .then((result) =>{
        for (const obj in result) {
            mensajes.push(result[obj])
            }        
    })
    .catch((err) => { console.log(err); throw err })
    .finally(() => {
        //contProd.close()
    })



app.use(express.static('public'))

io.on('connection',async socket => {
    console.log('Nuevo cliente conectado!')

    /* Envio los mensajes al cliente que se conectó */
    socket.emit('mensajes', mensajes)

    // /* Escucho los mensajes enviado por el cliente y se los propago a todos */
    
    socket.on('mensaje',  data =>  {
        try {
            const msj = {fecha, mensaje: JSON.stringify(data)}
            mensajes.push(msj)
            io.sockets.emit('mensajes', mensajes) 
            contChat.save(msj, 'chat')
            .then(() => {
               return 
            })
            .catch((err) => { console.log(err); throw err })
            .finally(() => {
                //contProd.close()
            })
        } catch(err) {
            console.log(err)  
        }
    })

    socket.emit('productos', productos)

    socket.on('producto', data => {
        try {
            productos.push(data)
            io.sockets.emit('productos', productos)
            contProd.save([data], 'productos')
            .then(() => {
               return 
            })
            .catch((err) => { console.log(err); throw err })
            .finally(() => {
                //contProd.close()
            })
            
        } catch(err) {
            console.log(err)  
        }
       
    })
    
})

const PORT = 8080
const connectedServer = httpServer.listen(PORT, function () {
    console.log(`Servidor Http con Websockets escuchando en el puerto ${connectedServer.address().port}`)
})
connectedServer.on('error', error => console.log(`Error en servidor ${error}`))
