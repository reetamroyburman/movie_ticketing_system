// 'use strict';

// module.exports = {
//   async up(queryInterface, Sequelize) {
//     await queryInterface.createTable('refresh_tokens', {
//       id: {
//         type: Sequelize.UUID,
//         defaultValue: Sequelize.UUIDV4,
//         primaryKey: true,
//         allowNull: false,
//       },
//       userId: {
//         type: Sequelize.UUID,
//         allowNull: false,
//         references: { model: 'users', key: 'id' },
//         onDelete: 'CASCADE',
//       },
//       token: { type: Sequelize.TEXT, allowNull: false },
//       expiresAt: { type: Sequelize.DATE, allowNull: false },
//       revoked: { type: Sequelize.BOOLEAN, defaultValue: false },
//       createdAt: { type: Sequelize.DATE, allowNull: false },
//       updatedAt: { type: Sequelize.DATE, allowNull: false },
//     });

//     await queryInterface.addIndex('refresh_tokens', ['userId']);
//     await queryInterface.addIndex('refresh_tokens', ['token'], { unique: true });
//   },

//   async down(queryInterface) {
//     await queryInterface.dropTable('refresh_tokens');
//   },
// };


'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('refresh_tokens', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },

      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      
      token: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },

      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      revoked: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Indexes
    await queryInterface.addIndex('refresh_tokens', ['userId']);
    // token already unique → index auto-created
  },

  async down(queryInterface) {
    await queryInterface.dropTable('refresh_tokens');
  },
};