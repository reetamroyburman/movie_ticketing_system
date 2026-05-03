'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('movies', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      title: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.TEXT },
      genre: { type: Sequelize.STRING },
      language: { type: Sequelize.STRING },
      durationMinutes: { type: Sequelize.INTEGER, allowNull: false },
      rating: { type: Sequelize.ENUM('U', 'UA', 'A'), allowNull: false },
      releaseDate: { type: Sequelize.DATEONLY },
      posterUrl: { type: Sequelize.STRING },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
      deletedAt: { type: Sequelize.DATE },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('movies', ['genre']);
    await queryInterface.addIndex('movies', ['language']);
    await queryInterface.addIndex('movies', ['rating']);
    await queryInterface.addIndex('movies', ['releaseDate']);
    await queryInterface.addIndex('movies', ['isActive']);
    await queryInterface.addIndex('movies', ['deletedAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('movies');
  },
};
