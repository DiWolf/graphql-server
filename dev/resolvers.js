const Usuario = require("../models/Usuario");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const producto = require("../models/producto");
const Clientes = require("../models/Clientes");
const Pedido = require("../models/Pedido");

require("dotenv").config({ path: "variable.env" });

const crearToken = (Usuario, secreta, expiresIn) => {
  const { id, email, nombre, apellido } = Usuario;
  return jwt.sign({ id, email, nombre, apellido }, secreta, { expiresIn });
};
const resolvers = {
  Query: {
    obtenerUsuario: async (_, {}, ctx) => {
      // const usuarioId = await jwt.verify(token, process.env.SECRETA);
      // return usuarioId;
      // console.log(ctx);
      return ctx.usuario;
    },

    obtenerProductos: async () => {
      try {
        const productos = await producto.find({});
        return productos;
      } catch (error) {
        console.log(error);
      }
    },

    obtenerProducto: async (_, { id }) => {
      try {
        //revisar si el producto existe
        const _producto = await producto.findById(id);
        if (!_producto) {
          throw new Error("Producto no encontrado");
        }

        return _producto;
      } catch (error) {
        console.log(error);
      }
    },

    obtenerClientes: async () => {
      try {
        const _clientes = await Clientes.find({});
        return _clientes;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerClientesVendedor: async (_, {}, ctx) => {
      try {
        const _clientes = await Clientes.find({
          vendedor: ctx.usuario.id.toString(),
        });
        return _clientes;
      } catch (error) {}
    },
    obtenerCliente: async (_, { id }, ctx) => {
      // Revisar si el cliente existe o no

      const cliente = await Clientes.findById(id);

      if (!cliente) {
        throw new Error("Cliente no encontrado");
      }
      // //quien lo creo puede verlo
      if (cliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales");
      }

      return cliente;
    },

    obtenerPedidos: async () => {
      try {
        const _pedidos = await Pedido.find({});
        return _pedidos;
      } catch (error) {
        console.log(error);
      }
    },

    obtenerPedidosVendedor: async (_, {}, ctx) => {
      try {
        const pedidos = await Pedido.find({
          vendedor: ctx.usuario.id,
        }).populate("cliente");
        console.log(pedidos);
        return pedidos;
      } catch (error) {
        console.log(error);
      }
    },

    obtenerPedido: async (_, { id }, ctx) => {
      const pedido = await Pedido.findById(id);
      if (!pedido) {
        throw new Error("Pedido no encontrado");
      }
      //solo quien lo creo puede verlo
      if (pedido.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("Acci??n no permitida");
      }

      //retornar resultado
      return pedido;
    },

    obtenerPedidosEstado: async (_, { estado }, ctx) => {
      const pedidos = await Pedido.find({ vendedor: ctx.usuario.id, estado });

      return pedidos;
    },

    mejoresClientes: async () => {
      const clientes = await Pedido.aggregate([
        { $match: { estado: "COMPLETADO" } },
        { $group: { _id: "$cliente", total: { $sum: "$total" } } },
        {
          $lookup: {
            from: "cliente",
            localField: "_id",
            foreignField: "_id",
            as: "cliente",
          },
        },
        {
          $sort: { total: -1 },
        },
      ]);
      return clientes;
    },

    mejoresVendedores: async () => {
      const vendedores = await Pedido.aggregate([
        { $match: { estado: "COMPLETADO" } },
        { $group: { _id: "$vendedor", total: { $sum: "$total" } } },
        {
          $lookup: {
            from: "usuarios",
            localField: "_id",
            foreignField: "_id",
            as: "vendedor",
          },
        },
        {
          $limit: 5,
        },
        {
          $sort: { total: -1 },
        },
      ]);
      return vendedores;
    },

    buscarProducto: async (_, { texto }) => {
      const productos = await Producto.find({
        $text: { $search: texto },
      }).limit(10);
      return productos;
    },
  },
  Mutation: {
    nuevoUsuario: async (_, { input }, ctx) => {
      const { email, password } = input;

      //Revisar si el usuario ya est?? registrado
      const existeUsuario = await Usuario.findOne({ email });
      if (existeUsuario) {
        throw new Error("El usuario ya est?? registrado");
      }

      //Hash password
      const salt = await bcryptjs.genSaltSync(12);
      input.password = await bcryptjs.hashSync(password, salt);

      //Guardar en base de datos.
      try {
        const usuario = new Usuario(input);
        usuario.save();
        return usuario;
      } catch (error) {
        console.log(error);
      }
    },

    autenticarUsuario: async (_, { input }, ctx) => {
      const { email, password } = input;

      const existeUsuario = await Usuario.findOne({ email });
      if (!existeUsuario) {
        throw new Error("El usuario no existe");
      }

      const passwordCorrecto = await bcryptjs.compareSync(
        password,
        existeUsuario.password
      );

      if (!passwordCorrecto) {
        throw new Error("La contrase??a es incorrecta");
      }

      return {
        token: crearToken(existeUsuario, process.env.SECRETA, "8h"),
      };

      //Revisar si el password es correcto
    },

    nuevoProducto: async (_, { input }, ctx) => {
      console.log(input);
      try {
        const _producto = new producto(input);
        const resultado = await _producto.save();
        return resultado;
      } catch (error) {
        console.log(error);
      }
    },

    actualizarProducto: async (_, { id, input }, ctx) => {
      try {
        let _producto = await producto.findById(id);

        if (!_producto) {
          throw new Error("El producto no existe");
        }

        _producto = await producto.findOneAndUpdate({ _id: id }, input, {
          new: true,
        });

        return _producto;
      } catch (error) {
        console.log(error);
      }
    },

    eliminarProducto: async (_, { id }) => {
      let _producto = await producto.findById(id);
      if (!_producto) {
        throw new Error("Producto no encontrado");
      }
      await producto.findOneAndDelete({ _id: id });

      return "producto eliminado";
    },

    nuevoCliente: async (_, { input }, ctx) => {
      //verificar si el cliente ya est?? registrado
      // console.log(ctx.usuario.id);
      const { email } = input;
      const cliente = await Clientes.findOne({ email });

      if (cliente) {
        throw new Error("Cliente ya registrado");
      }
      //asingar vendedor
      const nuevoCliente = new Clientes(input);
      nuevoCliente.vendedor = ctx.usuario.id;

      //guardar en db
      try {
        const resultado = await nuevoCliente.save();
        return resultado;
      } catch (error) {
        console.log(error);
      }
    },

    actualizarCliente: async (_, { id, input }, ctx) => {
      //verificar si existe o no
      let cliente = await Clientes.findById(id);
      if (!cliente) {
        throw new Error("Cliente no encontrado");
      }
      //verificar el vendedor es el que edita
      if (cliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes credenciales");
      }

      //guardar el cliente
      cliente = await Clientes.findByIdAndUpdate({ _id: id }, input, {
        new: true,
      });

      return cliente;
    },
    eliminarCliente: async (_, { id }, ctx) => {
      let cliente = await Clientes.findById(id);

      if (!cliente) {
        throw new Error("Cliente no existe");
      }

      if (cliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes credenciales para esta operaci??n");
      }

      //eliminar
      await Clientes.findOneAndDelete({ _id: id });
      return "Cliente eliminado";
    },
    nuevoPedido: async (_, { input }, ctx) => {
      const { cliente } = input;
      //verificar si existe el cliente
      let clienteExiste = await Clientes.findById(cliente);

      if (!clienteExiste) {
        throw new Error("El cliente no existe");
      }
      //verificar si el cliente es del vendedor.
      if (clienteExiste.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes credenciales");
      }

      //revisar que el stock est?? disponible.
      for await (const articulo of input.pedido) {
        const { id } = articulo;
        const _producto = await producto.findById(id);

        if (articulo.cantidad > _producto.existencia) {
          throw new Error(
            `El art??culo ${_producto.nombre} excede la cantidad disponible`
          );
        } else {
          //Restar la cantidad a lo disponible
          _producto.existencia = _producto.existencia - articulo.cantidad;
          await _producto.save();
        }
      }

      const nuevoPedido = new Pedido(input);

      //asignar un vendedor.
      nuevoPedido.vendedor = ctx.usuario.id;

      //guardar en la base de datos
      const resultado = await nuevoPedido.save();
      return resultado;
    },
    actualizarPedido: async (_, { id, input }, ctx) => {
      try {
        const { cliente } = input;
        //pedido existe
        const _existePedido = await Pedido.findById(id);

        if (!_existePedido) {
          throw new Error("El pedido no existe");
        }

        //si el cliente existe
        const existeCliente = await Clientes.findById(cliente);
        if (!existeCliente) {
          throw new Error("El cliente no existe");
        }

        //si el cliente y pedido pertenencen al vendedor
        if (existeCliente.vendedor.toString() !== ctx.usuario.id) {
          throw new Error("No tienes las credenciales");
        }

        // Revisar el stock
        if (input.pedido) {
          for await (const articulo of input.pedido) {
            const { id } = articulo;

            const producto = await Producto.findById(id);

            if (articulo.cantidad > producto.existencia) {
              throw new Error(
                `El articulo: ${producto.nombre} excede la cantidad disponible`
              );
            } else {
              // Restar la cantidad a lo disponible
              producto.existencia = producto.existencia - articulo.cantidad;

              await producto.save();
            }
          }
        }

        

        //guardar el pedido modificado.
        const resultado = await Pedido.findOneAndUpdate({ _id: id }, input, {
          new: true,
        });

        return resultado;
      } catch (error) {
        console.log(error);
      }
    },

    eliminarPedido: async (_, { id }, ctx) => {
      //verificamos si existe o no
      const pedido = Pedido.findById(id);
      if (!pedido) {
        throw new Error("El pedido no existe");
      }

      if (pedido.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales");
      }

      await Pedido.findOneAndDelete({ _id: id });
      return "Pedido eliminado";
    },
  },
};

module.exports = resolvers;
